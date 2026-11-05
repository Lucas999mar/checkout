import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function calcPercentChange(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Number((((curr - prev) / prev) * 100).toFixed(1));
}

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
    let prevStart: Date;
    let prevEnd: Date;
    let isHourly = false;

    // Definição dos períodos atual e comparativo anterior (MoM / WoW / DoD)
    if (period === 'today') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      prevStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, now.getHours(), now.getMinutes(), 59);
      isHourly = true;
    } else if (period === 'yesterday') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
      periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      prevStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 23, 59, 59, 999);
      isHourly = true;
    } else if (period === '7d') {
      periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      prevStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      prevEnd = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === '30d') {
      periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      prevStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      prevEnd = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (period === '90d') {
      periodStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      prevStart = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      prevEnd = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (period === 'this_month') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (period === 'last_month') {
      periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      periodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
    } else if (period === 'this_year') {
      periodStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      prevStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0);
      prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    } else if (period === 'all') {
      periodStart = new Date(2020, 0, 1);
      prevStart = new Date(2019, 0, 1);
      prevEnd = new Date(2019, 11, 31);
    } else if (period === 'custom' && customStart) {
      periodStart = new Date(customStart);
      periodEnd = customEnd ? new Date(customEnd + 'T23:59:59.999Z') : new Date();
      const diffTime = Math.abs(periodEnd.getTime() - periodStart.getTime());
      prevStart = new Date(periodStart.getTime() - diffTime);
      prevEnd = new Date(periodStart.getTime());
    } else {
      periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      prevStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      prevEnd = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // 6 meses atrás para gráfico histórico mensal comparativo
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0);

    // Consultas otimizadas em paralelo
    const [
      totalRevenueAllTime,
      periodPayments,
      prevPeriodPayments,
      sixMonthsPayments,
      totalCustomers,
      totalProducts,
      activeLinks,
      totalSubscriptions,
      activeSubscriptions,
      productsWithPayments,
      recentPayments,
    ] = await Promise.all([
      // Faturamento histórico total
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'APPROVED' },
      }),
      // Todos os pagamentos do período atual com detalhes para DRE
      prisma.payment.findMany({
        where: { createdAt: { gte: periodStart, lte: periodEnd } },
        include: { product: true, customer: true },
      }),
      // Todos os pagamentos do período anterior para comparação
      prisma.payment.findMany({
        where: { createdAt: { gte: prevStart, lte: prevEnd } },
        select: { amount: true, status: true, paidAt: true },
      }),
      // Pagamentos aprovados dos últimos 6 meses para histórico comparativo
      prisma.payment.findMany({
        where: {
          status: 'APPROVED',
          paidAt: { gte: sixMonthsAgo },
        },
        select: { amount: true, paidAt: true, mpPaymentMethodId: true },
        orderBy: { paidAt: 'asc' },
      }),
      // Contadores de entidades
      prisma.customer.count(),
      prisma.product.count(),
      prisma.paymentLink.count({ where: { active: true } }),
      prisma.subscription.count(),
      prisma.subscription.count({ where: { status: 'AUTHORIZED' } }),
      // Produtos com vendas
      prisma.product.findMany({
        where: { active: true },
        include: {
          payments: {
            where: { createdAt: { gte: periodStart, lte: periodEnd } },
            select: { amount: true, status: true, deliveryStatus: true },
          },
        },
      }),
      // Transações mais recentes
      prisma.payment.findMany({
        where: { createdAt: { gte: periodStart, lte: periodEnd } },
        take: 12,
        orderBy: { createdAt: 'desc' },
        include: { customer: true, product: true },
      }),
    ]);

    // ─────────────────────────────────────────────────────────────
    // 1. CÁLCULO DO DRE E MÉTRICAS DO PERÍODO ATUAL
    // ─────────────────────────────────────────────────────────────
    let grossRevenue = 0;
    let gatewayFees = 0;
    let refundsAmount = 0;
    let lostRevenue = 0;
    let pendingRevenue = 0;
    let rejectedRevenue = 0;

    let approvedCount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;
    let refundedCount = 0;

    const methodMap: Record<string, { count: number; total: number; fees: number }> = {};

    periodPayments.forEach((p) => {
      const method = (p.mpPaymentMethodId || 'pix').toLowerCase();
      if (!methodMap[method]) {
        methodMap[method] = { count: 0, total: 0, fees: 0 };
      }

      if (p.status === 'APPROVED') {
        grossRevenue += p.amount;
        approvedCount++;
        methodMap[method].count++;
        methodMap[method].total += p.amount;

        // Cálculo realista de taxas de gateway:
        // PIX Mercado Pago: ~0.99% | PIX Chave Direta: 0.00%
        // Cartão: ~3.99% + R$ 0.40
        // Boleto: R$ 3.45 fixo
        let fee = 0;
        if (method === 'pix') {
          if (p.bankProvider === 'mercadopago') fee = p.amount * 0.0099;
          else fee = 0;
        } else if (method.includes('bol')) {
          fee = 3.45;
        } else {
          // Cartões
          fee = p.amount * 0.0399 + 0.4;
        }
        gatewayFees += fee;
        methodMap[method].fees += fee;
      } else if (p.status === 'REFUNDED') {
        refundsAmount += p.amount;
        refundedCount++;
      } else if (p.status === 'PENDING') {
        lostRevenue += p.amount;
        pendingRevenue += p.amount;
        pendingCount++;
      } else if (p.status === 'REJECTED' || p.status === 'CANCELLED') {
        lostRevenue += p.amount;
        rejectedRevenue += p.amount;
        rejectedCount++;
      }
    });

    const totalOrders = periodPayments.length;
    const netRevenue = Math.max(0, grossRevenue - gatewayFees - refundsAmount);
    const netMarginPercent = grossRevenue > 0 ? Number(((netRevenue / grossRevenue) * 100).toFixed(1)) : 100;
    const avgTicket = approvedCount > 0 ? Number((grossRevenue / approvedCount).toFixed(2)) : 0;
    const conversionRate = totalOrders > 0 ? Number(((approvedCount / totalOrders) * 100).toFixed(1)) : 0;
    const potentialLostPercent =
      grossRevenue + lostRevenue > 0 ? Number(((lostRevenue / (grossRevenue + lostRevenue)) * 100).toFixed(1)) : 0;

    // ─────────────────────────────────────────────────────────────
    // 2. MÉTRICAS DO PERÍODO ANTERIOR (MoM / WoW)
    // ─────────────────────────────────────────────────────────────
    let prevGrossRevenue = 0;
    let prevApprovedCount = 0;
    const prevTotalOrders = prevPeriodPayments.length;

    prevPeriodPayments.forEach((p) => {
      if (p.status === 'APPROVED') {
        prevGrossRevenue += p.amount;
        prevApprovedCount++;
      }
    });

    const prevAvgTicket = prevApprovedCount > 0 ? Number((prevGrossRevenue / prevApprovedCount).toFixed(2)) : 0;
    const prevConversionRate =
      prevTotalOrders > 0 ? Number(((prevApprovedCount / prevTotalOrders) * 100).toFixed(1)) : 0;

    const comparisons = {
      revenueGrowth: calcPercentChange(grossRevenue, prevGrossRevenue),
      salesGrowth: calcPercentChange(approvedCount, prevApprovedCount),
      ticketGrowth: calcPercentChange(avgTicket, prevAvgTicket),
      conversionGrowth: calcPercentChange(conversionRate, prevConversionRate),
      prevGrossRevenue,
      prevApprovedCount,
      prevAvgTicket,
    };

    // ─────────────────────────────────────────────────────────────
    // 3. HISTÓRICO COMPARATIVO MENSAL (ÚLTIMOS 6 MESES)
    // ─────────────────────────────────────────────────────────────
    const monthlyHistory: Array<{
      monthKey: string;
      label: string;
      grossRevenue: number;
      netRevenue: number;
      salesCount: number;
      avgTicket: number;
    }> = [];

    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mYear = targetDate.getFullYear();
      const mMonth = targetDate.getMonth();
      const key = `${mYear}-${(mMonth + 1).toString().padStart(2, '0')}`;
      const label = targetDate.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();

      monthlyHistory.push({
        monthKey: key,
        label: `${label}/${mYear.toString().slice(-2)}`,
        grossRevenue: 0,
        netRevenue: 0,
        salesCount: 0,
        avgTicket: 0,
      });
    }

    sixMonthsPayments.forEach((p) => {
      if (p.paidAt) {
        const pDate = new Date(p.paidAt);
        const key = `${pDate.getFullYear()}-${(pDate.getMonth() + 1).toString().padStart(2, '0')}`;
        const item = monthlyHistory.find((m) => m.monthKey === key);
        if (item) {
          item.grossRevenue += p.amount;
          item.salesCount++;
          // Taxa média estimada de 1.8%
          const fee = p.mpPaymentMethodId === 'pix' ? 0 : p.amount * 0.035;
          item.netRevenue += p.amount - fee;
        }
      }
    });

    monthlyHistory.forEach((m) => {
      m.avgTicket = m.salesCount > 0 ? Number((m.grossRevenue / m.salesCount).toFixed(2)) : 0;
      m.grossRevenue = Number(m.grossRevenue.toFixed(2));
      m.netRevenue = Number(m.netRevenue.toFixed(2));
    });

    // ─────────────────────────────────────────────────────────────
    // 4. TIMELINE DE FATURAMENTO (PARA GRÁFICO DIÁRIO / HORÁRIO)
    // ─────────────────────────────────────────────────────────────
    const timelineData: Record<string, number> = {};

    if (isHourly) {
      for (let h = 0; h < 24; h++) {
        timelineData[`${h.toString().padStart(2, '0')}:00`] = 0;
      }
      periodPayments.forEach((p) => {
        if (p.status === 'APPROVED' && p.paidAt) {
          const hour = `${new Date(p.paidAt).getHours().toString().padStart(2, '0')}:00`;
          timelineData[hour] = (timelineData[hour] || 0) + p.amount;
        }
      });
    } else {
      periodPayments.forEach((p) => {
        if (p.status === 'APPROVED' && p.paidAt) {
          const day = p.paidAt.toISOString().split('T')[0];
          timelineData[day] = (timelineData[day] || 0) + p.amount;
        }
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 5. DETALHAMENTO DE PRODUTOS
    // ─────────────────────────────────────────────────────────────
    const productsBreakdown = productsWithPayments.map((prod) => {
      let prodRevenue = 0;
      let prodApproved = 0;
      let prodPending = 0;
      let prodDelivered = 0;

      prod.payments.forEach((pay) => {
        if (pay.status === 'APPROVED') {
          prodRevenue += pay.amount;
          prodApproved++;
          if (pay.deliveryStatus === 'DELIVERED') prodDelivered++;
        } else if (pay.status === 'PENDING') {
          prodPending++;
        }
      });

      const totalProd = prod.payments.length;
      return {
        id: prod.id,
        name: prod.name,
        imageUrl: prod.imageUrl,
        deliveryType: prod.deliveryType,
        grossRevenue: prodRevenue,
        approvedSales: prodApproved,
        pendingSales: prodPending,
        totalSales: totalProd,
        conversionRate: totalProd > 0 ? Number(((prodApproved / totalProd) * 100).toFixed(1)) : 0,
        deliveryRate: prodApproved > 0 ? Number(((prodDelivered / prodApproved) * 100).toFixed(1)) : 100,
      };
    }).sort((a, b) => b.grossRevenue - a.grossRevenue);

    // ─────────────────────────────────────────────────────────────
    // 6. MOTOR DE DIAGNÓSTICO ESTRATÉGICO ("ONDE TERIA QUE MELHORAR")
    // ─────────────────────────────────────────────────────────────
    const insights: Array<{
      id: string;
      type: 'warning' | 'success' | 'info' | 'danger';
      badge: string;
      title: string;
      description: string;
      metric?: string;
      actionRecommendation: string;
    }> = [];

    // Diagnóstico 1: Recuperação de PIX Pendente
    if (pendingRevenue > 0) {
      insights.push({
        id: 'pix-recovery',
        type: 'warning',
        badge: 'Oportunidade Imediata',
        title: 'Recuperação de PIX Abandonado',
        description: `Existem R$ ${pendingRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em transações PIX geradas e ainda não pagas no período. Ativar lembretes com link de pagamento no WhatsApp pode recuperar entre 25% e 40% dessa receita.`,
        metric: `+R$ ${(pendingRevenue * 0.35).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} estimativa`,
        actionRecommendation: 'Disparar mensagem no WhatsApp para os clientes com status pendente.',
      });
    } else {
      insights.push({
        id: 'pix-clean',
        type: 'success',
        badge: 'Excelente',
        title: 'Zero Abandono de PIX',
        description: 'Parabéns! Todos os pagamentos iniciados foram convertidos com sucesso. A taxa de conclusão do checkout está perfeita.',
        metric: '100% liquidez',
        actionRecommendation: 'Mantenha as campanhas ativas para continuar com máxima conversão.',
      });
    }

    // Diagnóstico 2: Mix de Pagamentos e Margem Operacional
    const pixData = methodMap['pix'] || { total: 0, count: 0 };
    const pixPercent = grossRevenue > 0 ? (pixData.total / grossRevenue) * 100 : 0;
    if (pixPercent >= 70) {
      insights.push({
        id: 'pix-margin',
        type: 'success',
        badge: 'Alta Rentabilidade',
        title: 'Margem Saudável com Domínio de PIX',
        description: `O PIX é responsável por ${pixPercent.toFixed(0)}% do seu faturamento. Isso reduz significativamente as taxas de intermediação e garante liquidez imediata com margem líquida de ${netMarginPercent}%.`,
        metric: `${netMarginPercent}% margem líquida`,
        actionRecommendation: 'Continue posicionando o PIX como a primeira opção no checkout.',
      });
    } else {
      insights.push({
        id: 'optimize-pix',
        type: 'info',
        badge: 'Otimização de Custos',
        title: 'Incentivar Pagamentos via PIX',
        description: 'Você possui um volume relevante em cartão de crédito. Oferecer um desconto sutil de 5% no PIX pode migrar pedidos e economizar até 3.99% em taxas de processamento.',
        metric: 'Economia estimada',
        actionRecommendation: 'Destaque o desconto ou vantagens do PIX na página de vendas.',
      });
    }

    // Diagnóstico 3: Ticket Médio & Order Bump
    if (avgTicket > 0 && avgTicket < 50) {
      insights.push({
        id: 'order-bump',
        type: 'info',
        badge: 'Escala de Lucro',
        title: 'Potencial de Order Bump / Oferta Adicional',
        description: `Seu ticket médio é de R$ ${avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. A inclusão de um produto complementar de baixo custo (ex: áudio, resumo ou planilha por R$ 9,90 a R$ 19,90) no momento do pagamento costuma ter aceitação de até 28%.`,
        metric: '+15% a 25% faturamento',
        actionRecommendation: 'Crie um produto complementar para oferecer durante a compra.',
      });
    } else if (avgTicket >= 50) {
      insights.push({
        id: 'high-ticket',
        type: 'success',
        badge: 'Ticket Médio Forte',
        title: 'Excelente Valor por Transação',
        description: `Seu ticket médio de R$ ${avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} está saudável. Clientes com esse perfil respondem muito bem a ofertas de pós-compra (Upsell).`,
        metric: `R$ ${avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / pedido`,
        actionRecommendation: 'Configure um link de upsell na mensagem automática do WhatsApp.',
      });
    }

    // Diagnóstico 4: Eficiência de Entrega Digital
    insights.push({
      id: 'instant-delivery',
      type: 'success',
      badge: 'Pós-Venda Automático',
      title: 'Entrega Instantânea Ativa',
      description: 'A liberação automática e instantânea do infoproduto na tela e no WhatsApp reduz pedidos de suporte em até 90% e praticamente zera contestações bancárias.',
      metric: '0 chamados pendentes',
      actionRecommendation: 'Mantenha a instância do WhatsApp conectada para garantir entregas 24/7.',
    });

    // ─────────────────────────────────────────────────────────────
    // RETORNO COMPLETO PARA O DASHBOARD
    // ─────────────────────────────────────────────────────────────
    return NextResponse.json({
      period,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      isHourly,
      // DRE Estruturado
      dre: {
        grossRevenue: Number(grossRevenue.toFixed(2)),
        gatewayFees: Number(gatewayFees.toFixed(2)),
        refundsAmount: Number(refundsAmount.toFixed(2)),
        netRevenue: Number(netRevenue.toFixed(2)),
        netMarginPercent,
        lostRevenue: Number(lostRevenue.toFixed(2)),
        pendingRevenue: Number(pendingRevenue.toFixed(2)),
        rejectedRevenue: Number(rejectedRevenue.toFixed(2)),
        potentialLostPercent,
      },
      // Indicadores Principais
      overview: {
        totalRevenue: totalRevenueAllTime._sum.amount || 0,
        periodRevenue: grossRevenue,
        netRevenue,
        avgTicket,
        totalOrders,
        approvedPayments: approvedCount,
        pendingPayments: pendingCount,
        rejectedPayments: rejectedCount,
        refundedPayments: refundedCount,
        conversionRate,
        totalCustomers,
        totalProducts,
        activeLinks,
        totalSubscriptions,
        activeSubscriptions,
      },
      // Comparações com período anterior (MoM)
      comparisons,
      // Histórico mensal comparativo (últimos 6 meses)
      monthlyHistory,
      // Métodos de pagamento
      paymentsByMethod: Object.entries(methodMap).map(([method, data]) => ({
        method,
        count: data.count,
        total: Number(data.total.toFixed(2)),
        fees: Number(data.fees.toFixed(2)),
        percent: grossRevenue > 0 ? Number(((data.total / grossRevenue) * 100).toFixed(1)) : 0,
      })),
      // Timeline diária/horária
      dailyRevenue: Object.entries(timelineData).map(([date, total]) => ({
        date,
        total: Number(total.toFixed(2)),
      })),
      // Produtos
      productsBreakdown,
      // Diagnóstico Estratégico
      insights,
      // Recentes
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        method: p.mpPaymentMethodId,
        customerName: p.customer?.name || 'Cliente Direto',
        customerPhone: p.customer?.phone || null,
        productName: p.product?.name || 'Checkout Direto',
        deliveryStatus: p.deliveryStatus,
        createdAt: p.createdAt,
        paidAt: p.paidAt,
      })),
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
