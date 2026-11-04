import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutPreference } from '@/lib/mercadopago';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, amount, payerEmail, productId, paymentLinkId, excludedPaymentMethods } = body;

    if (!amount || !payerEmail || !title) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: amount, payerEmail, title' },
        { status: 400 }
      );
    }

    // Find or create customer
    let customer = await prisma.customer.findUnique({ where: { email: payerEmail } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: { email: payerEmail, name: 'Cliente' },
      });
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        customerId: customer.id,
        productId: productId || null,
        paymentLinkId: paymentLinkId || null,
        amount,
        status: 'PENDING',
      },
    });

    // Create preference on Mercado Pago
    const result = await createCheckoutPreference({
      title,
      description: description || title,
      amount,
      payerEmail,
      externalReference: payment.id,
      excludedPaymentMethods,
    });

    // Update payment with preference data
    await prisma.payment.update({
      where: { id: payment.id },
      data: { mpPreferenceId: result.preferenceId },
    });

    return NextResponse.json({
      paymentId: payment.id,
      preferenceId: result.preferenceId,
      initPoint: result.initPoint,
      sandboxInitPoint: result.sandboxInitPoint,
    });
  } catch (error: any) {
    console.error('Preference error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao criar preferência' }, { status: 500 });
  }
}
