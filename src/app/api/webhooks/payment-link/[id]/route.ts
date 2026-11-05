import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { deliverProduct } from '@/lib/delivery';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const rawBody = await request.text();
    let body: any = {};
    try {
      body = JSON.parse(rawBody);
    } catch {
      const p = new URLSearchParams(rawBody);
      body = Object.fromEntries(p.entries());
    }

    const link = await prisma.paymentLink.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: { product: true, price: true },
    });

    if (!link) {
      return NextResponse.json({ error: 'Link de pagamento não encontrado' }, { status: 404 });
    }

    await prisma.webhookLog.create({
      data: {
        source: link.bankProvider || 'external_link',
        eventType: body.event || body.type || 'payment_webhook',
        payload: rawBody.slice(0, 4000),
      },
    });

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
      request.nextUrl.searchParams.get('status') === 'approved';

    if (!isApproved) {
      return NextResponse.json({ received: true, status: 'pending_confirmation' });
    }

    const customerEmail = body.customer?.email || body.payer?.email || body.customerEmail;
    const customerName = body.customer?.name || body.payer?.name || body.customerName || 'Cliente';
    const customerPhone = body.customer?.phone || body.customer?.phone_number || body.payer?.phone || body.customerPhone;
    const amountPaid = parseFloat(body.amount || body.value || body.data?.transaction_amount || link.price.amount);

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

    // Procura transação pendente recente deste link
    let payment = await prisma.payment.findFirst({
      where: {
        paymentLinkId: link.id,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (payment) {
      payment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'APPROVED',
          paidAt: new Date(),
          customerId: customerId || payment.customerId,
          amount: amountPaid > 0 ? amountPaid : payment.amount,
        },
      });
    } else {
      payment = await prisma.payment.create({
        data: {
          paymentLinkId: link.id,
          productId: link.productId,
          customerId,
          amount: amountPaid > 0 ? amountPaid : link.price.amount,
          currency: 'BRL',
          status: 'APPROVED',
          paidAt: new Date(),
          bankProvider: link.bankProvider || 'external',
          mpPaymentMethodId: 'external_link',
          metadata: JSON.stringify({
            source: 'dedicated_link_webhook',
            linkId: link.id,
            slug: link.slug,
          }),
        },
      });
    }

    await prisma.paymentLink.update({
      where: { id: link.id },
      data: { usedCount: { increment: 1 } },
    });

    if (payment.deliveryStatus !== 'DELIVERED') {
      try {
        await deliverProduct(payment.id);
      } catch (err) {
        console.error('Erro ao entregar produto digital:', err);
      }
    }

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      amount: payment.amount,
      status: 'APPROVED',
    });
  } catch (error: any) {
    console.error('Erro no webhook dedicado do link:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json({
    status: 'Webhook dedicado ativo',
    linkId: params.id,
  });
}

