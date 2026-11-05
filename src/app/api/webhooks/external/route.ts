import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { deliverProduct } from '@/lib/delivery';

export const dynamic = 'force-dynamic';

/**
 * Webhook Universal para Gateways Externos (InfinitePay, Mercado Pago, Asaas, etc.)
 * 
 * Permite que gateways externos notifiquem pagamentos aprovados.
 * Sincroniza e contabiliza automaticamente o faturamento no DRE,
 * atualiza o status para APPROVED e dispara a entrega automática no WhatsApp e E-mail.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    let body: any = {};
    try {
      body = JSON.parse(rawBody);
    } catch {
      // Se não for JSON, pode ser form-urlencoded
      const params = new URLSearchParams(rawBody);
      body = Object.fromEntries(params.entries());
    }

    const { searchParams } = request.nextUrl;
    const slugParam = searchParams.get('slug') || body.slug || body.metadata?.slug;
    const linkIdParam = searchParams.get('linkId') || body.linkId || body.link_id || body.metadata?.linkId;
    const paymentIdParam = searchParams.get('paymentId') || body.paymentId || body.id || body.data?.id;

    // Registrar no log de auditoria
    await prisma.webhookLog.create({
      data: {
        source: body.source || body.gateway || searchParams.get('gateway') || 'external_gateway',
        eventType: body.event || body.type || body.status || 'payment_notification',
        payload: rawBody.slice(0, 4000),
      },
    });

    // Detectar status de aprovação em diferentes padrões de gateways
    const isApproved =
      body.status === 'paid' ||
      body.status === 'approved' ||
      body.status === 'COMPLETED' ||
      body.status === 'CONFIRMED' ||
      body.event === 'transaction.paid' ||
      body.event === 'transaction.succeeded' ||
      body.event === 'PAYMENT_CONFIRMED' ||
      body.event === 'PAYMENT_RECEIVED' ||
      body.action === 'payment.created' ||
      body.type === 'payment' ||
      searchParams.get('status') === 'approved';

    if (!isApproved) {
      return NextResponse.json({
        received: true,
        message: 'Evento registrado, aguardando confirmação de pagamento aprovado',
      });
    }

    // Extrair dados do cliente se enviados pelo gateway
    const customerEmail =
      body.customer?.email ||
      body.payer?.email ||
      body.customerEmail ||
      searchParams.get('email');
    const customerName =
      body.customer?.name ||
      body.payer?.name ||
      body.customerName ||
      searchParams.get('name') ||
      'Cliente Gateway';
    const customerPhone =
      body.customer?.phone ||
      body.customer?.phone_number ||
      body.payer?.phone ||
      body.customerPhone ||
      searchParams.get('phone');
    const amountPaid =
      parseFloat(body.amount || body.value || body.data?.transaction_amount || searchParams.get('amount') || '0') /
      (body.amount && !body.amount.toString().includes('.') && parseInt(body.amount) > 1000 ? 100 : 1);

    // 1. Localizar PaymentLink associado
    let link: any = null;
    if (slugParam) {
      link = await prisma.paymentLink.findUnique({
        where: { slug: slugParam },
        include: { product: true, price: true },
      });
    } else if (linkIdParam) {
      link = await prisma.paymentLink.findUnique({
        where: { id: linkIdParam },
        include: { product: true, price: true },
      });
    }

    // 2. Localizar Payment existente ou criar novo
    let payment: any = null;
    if (paymentIdParam) {
      payment = await prisma.payment.findFirst({
        where: {
          OR: [
            { id: paymentIdParam },
            { mpPaymentId: paymentIdParam.toString() },
          ],
        },
      });
    }

    // Se não encontrou por ID direto, busca a última intenção de pagamento pendente deste link
    if (!payment && link) {
      payment = await prisma.payment.findFirst({
        where: {
          paymentLinkId: link.id,
          status: 'PENDING',
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Upsert cliente se houver e-mail
    let customerId: string | null = null;
    if (customerEmail) {
      const customer = await prisma.customer.upsert({
        where: { email: customerEmail.toLowerCase().trim() },
        update: {
          name: customerName,
          phone: customerPhone || undefined,
        },
        create: {
          email: customerEmail.toLowerCase().trim(),
          name: customerName,
          phone: customerPhone || null,
        },
      });
      customerId = customer.id;
    }

    // Se ainda não existir pagamento, cria a transação aprovada vinculada ao link e produto
    if (!payment) {
      if (!link) {
        return NextResponse.json({
          error: 'Link de pagamento não identificado no webhook. Envie ?slug=seu-link ou ?linkId=...',
        }, { status: 400 });
      }

      payment = await prisma.payment.create({
        data: {
          paymentLinkId: link.id,
          productId: link.productId,
          customerId,
          amount: amountPaid > 0 ? amountPaid : link.price.amount,
          currency: 'BRL',
          status: 'APPROVED',
          paidAt: new Date(),
          bankProvider: link.bankProvider || 'infinitepay',
          mpPaymentMethodId: body.payment_method || 'external_link',
          metadata: JSON.stringify({
            source: 'external_webhook',
            gateway: link.bankProvider,
            payload: body,
          }),
        },
      });
    } else {
      // Atualiza pagamento existente para APROVADO
      payment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'APPROVED',
          paidAt: new Date(),
          customerId: customerId || payment.customerId,
          amount: amountPaid > 0 ? amountPaid : payment.amount,
          bankProvider: link?.bankProvider || payment.bankProvider,
          mpPaymentMethodId: body.payment_method || payment.mpPaymentMethodId || 'external_link',
        },
      });
    }

    // Atualiza contadores do Link
    if (link) {
      await prisma.paymentLink.update({
        where: { id: link.id },
        data: {
          usedCount: { increment: 1 },
        },
      });
    }

    // 3. Disparar Entrega Automática via WhatsApp e E-mail
    let delivered = false;
    if (payment && payment.deliveryStatus !== 'DELIVERED') {
      try {
        await deliverProduct(payment.id);
        delivered = true;
      } catch (delivErr) {
        console.error('Erro na entrega automática pós-webhook externo:', delivErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Pagamento sincronizado e contabilizado com sucesso!',
      paymentId: payment.id,
      amount: payment.amount,
      status: 'APPROVED',
      delivered,
    });
  } catch (error: any) {
    console.error('Erro no webhook externo:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const slug = searchParams.get('slug');
  const linkId = searchParams.get('linkId');

  return NextResponse.json({
    status: 'Webhook Universal aiCheckout Ativo',
    instructions: {
      postUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.aicheckout.com.br'}/api/webhooks/external`,
      exampleParams: '?slug=seu-link&status=approved&amount=97.00',
      supportedGateways: ['InfinitePay', 'Mercado Pago', 'Asaas', 'NuPay', 'Stripe', 'Custom'],
      activeForSlug: slug || linkId || 'Geral',
    },
  });
}

