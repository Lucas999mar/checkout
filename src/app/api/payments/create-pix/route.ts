import { NextRequest, NextResponse } from 'next/server';
import { createPixPayment } from '@/lib/mercadopago';
import prisma from '@/lib/prisma';
import { generateBacenPixPayload, generateQrCodeBase64, SUPPORTED_BANKS } from '@/lib/pix';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      amount,
      description,
      payerEmail,
      payerFirstName,
      payerLastName,
      payerCpf,
      payerPhone,
      productId,
      paymentLinkId,
      selectedBank,
    } = body;

    if (!amount || !payerEmail || !payerCpf) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: amount, payerEmail, payerCpf' },
        { status: 400 }
      );
    }

    // Find payment link if any
    let paymentLink: any = null;
    if (paymentLinkId) {
      paymentLink = await prisma.paymentLink.findUnique({ where: { id: paymentLinkId } });
    }

    // Determine target bank
    const bankCode = selectedBank || paymentLink?.bankProvider || 'mercadopago';
    const bankMeta = SUPPORTED_BANKS[bankCode] || SUPPORTED_BANKS.mercadopago;

    // Sanitize phone number (e.g. 5511999999999)
    const cleanPhone = payerPhone ? payerPhone.replace(/\D/g, '') : null;

    // Find or create customer
    let customer = await prisma.customer.findUnique({ where: { email: payerEmail } });
    const fullName = `${payerFirstName || ''} ${payerLastName || ''}`.trim() || 'Cliente';
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          email: payerEmail,
          name: fullName,
          cpf: payerCpf,
          phone: cleanPhone,
        },
      });
    } else {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          ...(cleanPhone ? { phone: cleanPhone } : {}),
          ...(payerCpf ? { cpf: payerCpf } : {}),
          ...(fullName && fullName !== 'Cliente' ? { name: fullName } : {}),
        },
      });
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        customerId: customer.id,
        productId: productId || null,
        paymentLinkId: paymentLinkId || null,
        bankProvider: bankCode,
        amount,
        status: 'PENDING',
      },
    });

    let pixQrCode = '';
    let pixQrCodeBase64 = '';
    let mpPaymentId: string | null = null;
    let mpStatus = 'pending';
    let expirationDate = new Date(Date.now() + 30 * 60 * 1000); // 30 min expiration

    // 1. If bank is Mercado Pago, attempt MP API
    if (bankCode === 'mercadopago') {
      try {
        const pixResult = await createPixPayment({
          amount,
          description: description || 'Pagamento via PIX',
          payerEmail,
          payerFirstName: payerFirstName || 'Cliente',
          payerLastName: payerLastName || '',
          payerCpf,
          externalReference: payment.id,
        });

        if (pixResult.qrCode) {
          pixQrCode = pixResult.qrCode;
          pixQrCodeBase64 = pixResult.qrCodeBase64 || '';
          mpPaymentId = pixResult.paymentId || null;
          mpStatus = pixResult.status || 'pending';
          if (pixResult.expirationDate) {
            expirationDate = new Date(pixResult.expirationDate);
          }
        }
      } catch (mpError) {
        console.warn('Mercado Pago API failed or in test mode, generating BACEN EMV PIX:', mpError);
      }
    }

    // 2. If non-MP bank OR MP API was skipped/fallback:
    if (!pixQrCode) {
      // Check if there is a customized BankConfig or link pixKey
      const bankConfig = await prisma.bankConfig.findUnique({ where: { code: bankCode } });
      const pixKey = paymentLink?.pixKey || bankConfig?.pixKey || 'contato@checkoutpro.com.br';
      const beneficiaryName = paymentLink?.pixBeneficiary || bankConfig?.beneficiary || 'CHECKOUT PRO BRASIL';
      const city = paymentLink?.pixCity || bankConfig?.city || 'SAO PAULO';

      // Generate BACEN EMV BR Code (Compatible with 100% of Brazilian banks)
      pixQrCode = generateBacenPixPayload({
        pixKey,
        beneficiaryName,
        beneficiaryCity: city,
        amount,
        txId: payment.id.replace(/-/g, '').slice(0, 25),
        description: (description || 'Pagamento').slice(0, 30),
      });

      pixQrCodeBase64 = await generateQrCodeBase64(pixQrCode);
      mpPaymentId = `PIX-${payment.id.slice(0, 8).toUpperCase()}`;
    }

    // Update payment in database
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        bankProvider: bankCode,
        mpPaymentId,
        mpStatus,
        mpPaymentMethodId: 'pix',
        mpPaymentTypeId: 'bank_transfer',
        pixQrCode,
        pixQrCodeBase64,
        pixExpirationDate: expirationDate,
      },
    });

    // Update payment link usage count
    if (paymentLinkId) {
      await prisma.paymentLink.update({
        where: { id: paymentLinkId },
        data: { usedCount: { increment: 1 } },
      });
    }

    return NextResponse.json({
      paymentId: payment.id,
      bankProvider: bankCode,
      bankName: bankMeta.name,
      bankColor: bankMeta.color,
      bankIcon: bankMeta.icon,
      deeplinkScheme: bankMeta.deeplinkScheme,
      mpPaymentId,
      qrCode: pixQrCode,
      qrCodeBase64: pixQrCodeBase64,
      expirationDate,
      status: 'PENDING',
    });
  } catch (error: any) {
    console.error('PIX payment error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao criar pagamento PIX' }, { status: 500 });
  }
}
