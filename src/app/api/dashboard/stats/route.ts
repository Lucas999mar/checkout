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

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Run all database queries in parallel
    const [
      totalRevenue,
      monthRevenue,
      weekRevenue,
      totalPayments,
      approvedPayments,
      pendingPayments,
      totalCustomers,
      totalProducts,
      activeLinks,
      totalSubscriptions,
      activeSubscriptions,
      paymentsByMethod,
      dailyPayments,
      recentPayments,
    ] = await Promise.all([
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'APPROVED' },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'APPROVED', paidAt: { gte: thirtyDaysAgo } },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'APPROVED', paidAt: { gte: sevenDaysAgo } },
      }),
      prisma.payment.count(),
      prisma.payment.count({ where: { status: 'APPROVED' } }),
      prisma.payment.count({ where: { status: 'PENDING' } }),
      prisma.customer.count(),
      prisma.product.count(),
      prisma.paymentLink.count({ where: { active: true } }),
      prisma.subscription.count(),
      prisma.subscription.count({ where: { status: 'AUTHORIZED' } }),
      prisma.payment.groupBy({
        by: ['mpPaymentMethodId'],
        _count: true,
        _sum: { amount: true },
        where: { status: 'APPROVED' },
      }),
      prisma.payment.findMany({
        where: { status: 'APPROVED', paidAt: { gte: thirtyDaysAgo } },
        select: { amount: true, paidAt: true },
        orderBy: { paidAt: 'asc' },
      }),
      prisma.payment.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { customer: true, product: true },
      }),
    ]);

    // Group daily revenue
    const dailyRevenue: Record<string, number> = {};
    dailyPayments.forEach((p) => {
      if (p.paidAt) {
        const day = p.paidAt.toISOString().split('T')[0];
        dailyRevenue[day] = (dailyRevenue[day] || 0) + p.amount;
      }
    });

    const conversionRate = totalPayments > 0
      ? ((approvedPayments / totalPayments) * 100).toFixed(1)
      : '0';

    return NextResponse.json({
      overview: {
        totalRevenue: totalRevenue._sum.amount || 0,
        monthRevenue: monthRevenue._sum.amount || 0,
        weekRevenue: weekRevenue._sum.amount || 0,
        totalPayments,
        approvedPayments,
        pendingPayments,
        totalCustomers,
        totalProducts,
        activeLinks,
        totalSubscriptions,
        activeSubscriptions,
        conversionRate: parseFloat(conversionRate),
      },
      paymentsByMethod: paymentsByMethod.map((p) => ({
        method: p.mpPaymentMethodId || 'unknown',
        count: p._count,
        total: p._sum.amount || 0,
      })),
      dailyRevenue: Object.entries(dailyRevenue).map(([date, total]) => ({
        date,
        total,
      })),
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        method: p.mpPaymentMethodId,
        customerName: p.customer?.name || 'N/A',
        productName: p.product?.name || 'N/A',
        createdAt: p.createdAt,
        paidAt: p.paidAt,
      })),
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
