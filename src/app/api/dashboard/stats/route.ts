import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const period = searchParams.get('period') || '30d';
    const customStart = searchParams.get('startDate');
    const customEnd = searchParams.get('endDate');

    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date = new Date();
    let isHourly = false;

    if (period === 'today') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      isHourly = true;
    } else if (period === 'yesterday') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
      periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      isHourly = true;
    } else if (period === '7d') {
      periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === '30d') {
      periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (period === '90d') {
      periodStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (period === 'this_month') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    } else if (period === 'this_year') {
      periodStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    } else if (period === 'all') {
      periodStart = new Date(2020, 0, 1);
    } else if (period === 'custom' && customStart) {
      periodStart = new Date(customStart);
      periodEnd = customEnd ? new Date(customEnd + 'T23:59:59.999Z') : new Date();
    } else {
      periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Queries in parallel
    const [
      totalRevenueAllTime,
      periodRevenue,
      monthRevenue,
      weekRevenue,
      totalPayments,
      periodTotalPayments,
      periodApprovedPayments,
      periodPendingPayments,
      totalCustomers,
      totalProducts,
      activeLinks,
      totalSubscriptions,
      activeSubscriptions,
      paymentsByMethod,
      periodPaymentsForChart,
      recentPayments,
    ] = await Promise.all([
      // Total de toda a história
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'APPROVED' },
      }),
      // Receita no período selecionado
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'APPROVED',
          paidAt: { gte: periodStart, lte: periodEnd },
        },
      }),
      // Receita últimos 30 dias (referência)
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'APPROVED', paidAt: { gte: thirtyDaysAgo } },
      }),
      // Receita últimos 7 dias (referência)
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'APPROVED', paidAt: { gte: sevenDaysAgo } },
      }),
      // Contadores
      prisma.payment.count(),
      prisma.payment.count({
        where: { createdAt: { gte: periodStart, lte: periodEnd } },
      }),
      prisma.payment.count({
        where: { status: 'APPROVED', createdAt: { gte: periodStart, lte: periodEnd } },
      }),
      prisma.payment.count({
        where: { status: 'PENDING', createdAt: { gte: periodStart, lte: periodEnd } },
      }),
      prisma.customer.count(),
      prisma.product.count(),
      prisma.paymentLink.count({ where: { active: true } }),
      prisma.subscription.count(),
      prisma.subscription.count({ where: { status: 'AUTHORIZED' } }),
      // Métodos de pagamento no período
      prisma.payment.groupBy({
        by: ['mpPaymentMethodId'],
        _count: true,
        _sum: { amount: true },
        where: {
          status: 'APPROVED',
          createdAt: { gte: periodStart, lte: periodEnd },
        },
      }),
      // Pagamentos para gráfico da linha do tempo no período
      prisma.payment.findMany({
        where: {
          status: 'APPROVED',
          paidAt: { gte: periodStart, lte: periodEnd },
        },
        select: { amount: true, paidAt: true },
        orderBy: { paidAt: 'asc' },
      }),
      // Recentes (respeitando o filtro ou últimos 15)
      prisma.payment.findMany({
        where: { createdAt: { gte: periodStart, lte: periodEnd } },
        take: 15,
        orderBy: { createdAt: 'desc' },
        include: { customer: true, product: true },
      }),
    ]);

    // Build timeline points for chart
    const timelineData: Record<string, number> = {};

    if (isHourly) {
      // 24 hours slots
      for (let h = 0; h < 24; h++) {
        const slot = `${h.toString().padStart(2, '0')}:00`;
        timelineData[slot] = 0;
      }
      periodPaymentsForChart.forEach((p) => {
        if (p.paidAt) {
          const hour = `${new Date(p.paidAt).getHours().toString().padStart(2, '0')}:00`;
          timelineData[hour] = (timelineData[hour] || 0) + p.amount;
        }
      });
    } else {
      // Daily slots
      periodPaymentsForChart.forEach((p) => {
        if (p.paidAt) {
          const day = p.paidAt.toISOString().split('T')[0];
          timelineData[day] = (timelineData[day] || 0) + p.amount;
        }
      });
    }

    const conversionRate = periodTotalPayments > 0
      ? ((periodApprovedPayments / periodTotalPayments) * 100).toFixed(1)
      : '0';

    return NextResponse.json({
      period,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      isHourly,
      overview: {
        totalRevenue: totalRevenueAllTime._sum.amount || 0,
        periodRevenue: periodRevenue._sum.amount || 0,
        monthRevenue: monthRevenue._sum.amount || 0,
        weekRevenue: weekRevenue._sum.amount || 0,
        totalPayments: periodTotalPayments,
        approvedPayments: periodApprovedPayments,
        pendingPayments: periodPendingPayments,
        totalCustomers,
        totalProducts,
        activeLinks,
        totalSubscriptions,
        activeSubscriptions,
        conversionRate: parseFloat(conversionRate),
      },
      paymentsByMethod: paymentsByMethod.map((p) => ({
        method: p.mpPaymentMethodId || 'pix',
        count: p._count,
        total: p._sum.amount || 0,
      })),
      dailyRevenue: Object.entries(timelineData).map(([date, total]) => ({
        date,
        total,
      })),
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        method: p.mpPaymentMethodId,
        customerName: p.customer?.name || 'Cliente Direto',
        productName: p.product?.name || 'Checkout Avulso',
        createdAt: p.createdAt,
        paidAt: p.paidAt,
      })),
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
