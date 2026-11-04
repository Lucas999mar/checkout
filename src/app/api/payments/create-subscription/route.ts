import { NextRequest, NextResponse } from 'next/server';
import { createSubscription } from '@/lib/mercadopago';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reason, amount, payerEmail, frequency, frequencyType, priceId, trialDays } = body;

    if (!amount || !payerEmail || !reason) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: amount, payerEmail, reason' },
        { status: 400 }
      );
    }

    // Find or create customer
    let customer = await prisma.customer.findUnique({ where: { email: payerEmail } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: { email: payerEmail, name: 'Assinante' },
      });
    }

    // Create subscription on Mercado Pago
    const result = await createSubscription({
      reason,
      amount,
      payerEmail,
      frequency: frequency || 1,
      frequencyType: frequencyType || 'months',
      trialDays,
      externalReference: customer.id,
    });

    // Create subscription record
    const subscription = await prisma.subscription.create({
      data: {
        customerId: customer.id,
        priceId: priceId || '',
        mpPreapprovalId: result.subscriptionId,
        mpInitPoint: result.initPoint,
        status: 'PENDING',
      },
    });

    return NextResponse.json({
      subscriptionId: subscription.id,
      mpSubscriptionId: result.subscriptionId,
      initPoint: result.initPoint,
      status: result.status,
    });
  } catch (error: any) {
    console.error('Subscription error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao criar assinatura' }, { status: 500 });
  }
}
