import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const [subscriptions, activeCount, pendingCount, cancelledCount] = await Promise.all([
      prisma.subscription.findMany({
        include: {
          customer: true,
          price: {
            include: { product: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.subscription.count({ where: { status: 'AUTHORIZED' } }),
      prisma.subscription.count({ where: { status: 'PENDING' } }),
      prisma.subscription.count({ where: { status: 'CANCELLED' } }),
    ]);

    const formatted = subscriptions.map((s) => ({
      id: s.id,
      mpPreapprovalId: s.mpPreapprovalId,
      status: s.status,
      startDate: s.currentPeriodStart || s.createdAt,
      endDate: s.currentPeriodEnd,
      nextBillingDate: s.currentPeriodEnd,
      customer: {
        name: s.customer.name,
        email: s.customer.email,
      },
      product: {
        name: s.price.product.name,
      },
      price: {
        amount: s.price.amount,
        interval: s.price.interval,
      },
      createdAt: s.createdAt,
    }));

    return NextResponse.json({
      subscriptions: formatted,
      stats: {
        active: activeCount,
        pending: pendingCount,
        cancelled: cancelledCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

