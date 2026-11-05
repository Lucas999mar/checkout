'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import toast from 'react-hot-toast';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DREData {
  grossRevenue: number;
  gatewayFees: number;
  refundsAmount: number;
  netRevenue: number;
  netMarginPercent: number;
  lostRevenue: number;
  pendingRevenue: number;
  rejectedRevenue: number;
  potentialLostPercent: number;
}

interface ComparisonsData {
  revenueGrowth: number;
  salesGrowth: number;
  ticketGrowth: number;
  conversionGrowth: number;
  prevGrossRevenue: number;
  prevApprovedCount: number;
  prevAvgTicket: number;
}

interface MonthlyHistoryItem {
  monthKey: string;
  label: string;
  grossRevenue: number;
  netRevenue: number;
  salesCount: number;
  avgTicket: number;
}

interface ProductBreakdownItem {
  id: string;
  name: string;
  imageUrl: string | null;
  deliveryType: string;
  grossRevenue: number;
  approvedSales: number;
  pendingSales: number;
  totalSales: number;
  conversionRate: number;
  deliveryRate: number;
}

interface InsightItem {
  id: string;
  type: 'warning' | 'success' | 'info' | 'danger';
  badge: string;
  title: string;
  description: string;
  metric?: string;
  actionRecommendation: string;
}

interface PaymentMethodItem {
  method: string;
  count: number;
  total: number;
  fees: number;
  percent: number;
}

interface DashboardStats {
  period?: string;
  isHourly?: boolean;
  periodStart?: string;
  periodEnd?: string;
  dre: DREData;
  overview: {
    totalRevenue: number;
    periodRevenue: number;
    netRevenue: number;
    avgTicket: number;
    totalOrders: number;
    approvedPayments: number;
    pendingPayments: number;
    rejectedPayments: number;
    refundedPayments: number;
    conversionRate: number;
    totalCustomers: number;
    totalProducts: number;
    activeLinks: number;
    totalSubscriptions: number;
    activeSubscriptions: number;
  };
  comparisons: ComparisonsData;
  monthlyHistory: MonthlyHistoryItem[];
  paymentsByMethod: PaymentMethodItem[];
  dailyRevenue: Array<{ date: string; total: number }>;
  productsBreakdown: ProductBreakdownItem[];
  insights: InsightItem[];
  recentPayments: Array<{
    id: string;
    amount: number;
    status: string;
    method: string | null;
    customerName: string;
    customerPhone: string | null;
    productName: string;
    deliveryStatus: string;
    createdAt: string;
    paidAt: string | null;
  }>;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const formatDate = (d: string) => {
  if (!d) return '';
  if (d.includes(':')) return d; // Hourly "14:00"
  try {
    const parts = d.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(d));
  } catch {
    return d;
  }
};

const formatFullDate = (d: string) => {
  if (!d) return '';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(d));
  } catch {
    return d;
  }
};

const getStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    APPROVED: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    PENDING: 'bg-amber-100 text-amber-800 border border-amber-200',
    REJECTED: 'bg-rose-100 text-rose-800 border border-rose-200',
    REFUNDED: 'bg-purple-100 text-purple-800 border border-purple-200',
    CANCELLED: 'bg-slate-100 text-slate-700 border border-slate-200',
  };
  const labels: Record<string, string> = {
    APPROVED: 'Aprovado',
    PENDING: 'Pendente',
    REJECTED: 'Recusado',
    REFUNDED: 'Estornado',
    CANCELLED: 'Cancelado',
  };
  return (
    <span className={`badge ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {labels[status] || status}
    </span>
  );
};

const getMethodLabel = (m: string | null) => {
  if (!m) return 'PIX';
  const cleaned = m.toLowerCase();
  const labels: Record<string, string> = {
    pix: 'PIX',
    visa: 'Cartão Visa',
    master: 'Cartão Master',
    bolbradesco: 'Boleto Bancário',
    elo: 'Cartão Elo',
    amex: 'Cartão Amex',
    hipercard: 'Hipercard',
  };
  return labels[cleaned] || m.toUpperCase();
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<string>('30d');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [showCustomInputs, setShowCustomInputs] = useState<boolean>(false);

  const fetchStats = useCallback(async (selectedPeriod: string, start?: string, end?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('period', selectedPeriod);
      if (selectedPeriod === 'custom') {
        if (start) params.set('startDate', start);
        if (end) params.set('endDate', end);
      }
      const res = await fetch(`/api/dashboard/stats?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar dados');
      setStats(data);
    } catch (err: any) {
      console.error('Failed to load stats:', err);
      toast.error('Erro ao carregar dados financeiros do dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(period);
  }, [fetchStats, period]);

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    if (newPeriod === 'custom') {
      setShowCustomInputs(true);
    } else {
      setShowCustomInputs(false);
    }
  };

  const applyCustomFilter = () => {
    if (!customStart) {
      toast.error('Selecione uma data inicial');
      return;
    }
    fetchStats('custom', customStart, customEnd);
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'today':
        return 'Hoje';
      case 'yesterday':
        return 'Ontem';
      case '7d':
        return 'Últimos 7 dias';
      case '30d':
        return 'Últimos 30 dias';
      case '90d':
        return 'Últimos 90 dias';
      case 'this_month':
        return 'Este Mês';
      case 'last_month':
        return 'Mês Anterior';
      case 'this_year':
        return 'Este Ano';
      case 'all':
        return 'Todo o Período';
      case 'custom':
        return 'Período Personalizado';
      default:
        return 'Últimos 30 dias';
    }
  };

  if (loading && !stats) {
    return (
      <div className="space-y-6">
        <div className="glass-card p-6 flex items-center justify-between">
          <div className="skeleton h-6 w-48 rounded" />
          <div className="skeleton h-8 w-64 rounded" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card p-6 space-y-3">
              <div className="skeleton h-4 w-24 rounded" />
              <div className="skeleton h-8 w-32 rounded" />
            </div>
          ))}
        </div>
        <div className="glass-card p-6">
          <div className="skeleton h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!stats) return <p className="text-surface-500">Erro ao carregar dados.</p>;

  const {
    overview,
    dre,
    comparisons,
    monthlyHistory,
    paymentsByMethod,
    dailyRevenue,
    productsBreakdown,
    insights,
    recentPayments,
    isHourly,
  } = stats;

  // Timeline Revenue Chart
  const revenueChartData = {
    labels: dailyRevenue.map((d) => (isHourly ? d.date : formatDate(d.date))),
    datasets: [
      {
        label: 'Receita Bruta (R$)',
        data: dailyRevenue.map((d) => d.total),
        fill: true,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.08)',
        borderWidth: 2.5,
        tension: 0.35,
        pointBackgroundColor: '#2563eb',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: dailyRevenue.length > 30 ? 2 : 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const revenueChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { size: 13, weight: 'bold' as const },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: any) => ` Faturamento: ${formatCurrency(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 11 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
      },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: {
          color: '#64748b',
          font: { size: 11 },
          callback: (value: any) => `R$ ${value}`,
        },
      },
    },
  };

  // Payment Methods Doughnut Chart
  const methodColors = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'];
  const methodChartData = {
    labels: paymentsByMethod.length > 0 ? paymentsByMethod.map((p) => getMethodLabel(p.method)) : ['Sem transações'],
    datasets: [
      {
        data: paymentsByMethod.length > 0 ? paymentsByMethod.map((p) => p.total) : [1],
        backgroundColor: paymentsByMethod.length > 0 ? methodColors.slice(0, paymentsByMethod.length) : ['#e2e8f0'],
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  };

  const methodChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { padding: 14, usePointStyle: true, pointStyle: 'circle', font: { size: 12, weight: 'bold' as const } },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        callbacks: {
          label: (ctx: any) => ` Total: ${formatCurrency(ctx.parsed)}`,
        },
      },
    },
    cutout: '68%',
  };

  // Monthly Comparison Bar Chart (6 Meses - Bruto vs Líquido)
  const monthlyChartData = {
    labels: monthlyHistory.map((m) => m.label),
    datasets: [
      {
        label: 'Receita Bruta',
        data: monthlyHistory.map((m) => m.grossRevenue),
        backgroundColor: '#3b82f6',
        borderRadius: 6,
        barPercentage: 0.6,
      },
      {
        label: 'Receita Líquida',
        data: monthlyHistory.map((m) => m.netRevenue),
        backgroundColor: '#10b981',
        borderRadius: 6,
        barPercentage: 0.6,
      },
    ],
  };

  const monthlyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { padding: 14, usePointStyle: true, pointStyle: 'circle', font: { size: 12, weight: 'bold' as const } },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: any) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 11, weight: 'bold' as const } },
      },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: {
          color: '#64748b',
          font: { size: 11 },
          callback: (value: any) => `R$ ${value}`,
        },
      },
    },
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & SELETOR DE PERÍODO
      ───────────────────────────────────────────────────────────── */}
      <div className="glass-card p-5 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-surface-900 tracking-tight">Visão Geral & DRE Financeiro</h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Tempo Real
            </span>
          </div>
          <p className="text-xs text-surface-500 font-medium mt-1">
            Auditoria completa de faturamento, margens líquidas, comparativo mensal e diagnóstico de vendas.
          </p>
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-surface-100 p-1.5 rounded-2xl border border-surface-200">
          {[
            { id: 'today', label: 'Hoje' },
            { id: 'yesterday', label: 'Ontem' },
            { id: '7d', label: '7 Dias' },
            { id: '30d', label: '30 Dias' },
            { id: 'this_month', label: 'Este Mês' },
            { id: 'last_month', label: 'Mês Anterior' },
            { id: '90d', label: '90 Dias' },
            { id: 'this_year', label: 'Este Ano' },
            { id: 'custom', label: '📅 Personalizado' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handlePeriodChange(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === item.id
                  ? 'bg-white text-primary-700 shadow-sm border border-surface-200'
                  : 'text-surface-600 hover:text-surface-900 hover:bg-surface-200/50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Pickers */}
      {showCustomInputs && (
        <div className="glass-card p-4 bg-primary-50/50 border border-primary-200 flex flex-wrap items-center gap-4 animate-slide-up">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-surface-700">Data Inicial:</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="input-field text-xs py-1.5 px-3 bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-surface-700">Data Final:</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="input-field text-xs py-1.5 px-3 bg-white"
            />
          </div>
          <button
            type="button"
            onClick={applyCustomFilter}
            className="btn-primary text-xs py-2 px-4 shadow-sm"
          >
            Aplicar Período
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. PRINCIPAIS KPIS EXECUTIVOS COM COMPARAÇÃO MoM
      ───────────────────────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {/* Receita Bruta */}
        <StatCardExecutive
          title={`Receita Bruta (${getPeriodLabel()})`}
          value={formatCurrency(dre.grossRevenue)}
          growth={comparisons.revenueGrowth}
          icon="💰"
          color="from-blue-600 to-indigo-600"
          subtitle={`Histórico total: ${formatCurrency(overview.totalRevenue)}`}
        />

        {/* Receita Líquida */}
        <StatCardExecutive
          title="Receita Líquida"
          value={formatCurrency(dre.netRevenue)}
          badgeText={`${dre.netMarginPercent}% margem`}
          badgeColor="bg-emerald-50 text-emerald-700 border-emerald-200"
          icon="✨"
          color="from-emerald-500 to-teal-600"
          subtitle={`Taxas Gateway: -${formatCurrency(dre.gatewayFees)}`}
        />

        {/* Ticket Médio */}
        <StatCardExecutive
          title="Ticket Médio"
          value={formatCurrency(overview.avgTicket)}
          growth={comparisons.ticketGrowth}
          icon="🎯"
          color="from-purple-500 to-violet-600"
          subtitle={`${overview.approvedPayments} vendas aprovadas`}
        />

        {/* Conversão de Vendas */}
        <StatCardExecutive
          title="Taxa de Conversão"
          value={`${overview.conversionRate}%`}
          growth={comparisons.conversionGrowth}
          icon="📈"
          color="from-amber-500 to-orange-600"
          subtitle={`${overview.approvedPayments} de ${overview.totalOrders} pedidos gerados`}
        />

        {/* Receita Pendente / Em Aberto */}
        <StatCardExecutive
          title="Receita em Aberto"
          value={formatCurrency(dre.pendingRevenue)}
          badgeText={dre.pendingRevenue > 0 ? 'A Recuperar' : 'Zero Pendências'}
          badgeColor={dre.pendingRevenue > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200'}
          icon="⏳"
          color="from-rose-500 to-red-600"
          subtitle={`${overview.pendingPayments} clientes em checkout`}
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. DRE GERENCIAL ESTRUTURADO (DEMONSTRATIVO DO RESULTADO)
      ───────────────────────────────────────────────────────────── */}
      <div className="glass-card overflow-hidden border border-surface-200">
        <div className="p-6 bg-gradient-to-r from-surface-900 via-surface-800 to-surface-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📑</span>
              <h3 className="text-lg font-bold">DRE Gerencial — Demonstrativo do Resultado</h3>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-white/10 text-white">
                {getPeriodLabel()}
              </span>
            </div>
            <p className="text-xs text-surface-300 mt-1">
              Visão analítica de receitas brutas, custos de gateway, reembolsos e margem líquida real de lucro.
            </p>
          </div>
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl">
            <div>
              <p className="text-[10px] text-surface-300 uppercase tracking-wider font-semibold">Margem Líquida Real</p>
              <p className="text-2xl font-black text-emerald-400">{dre.netMarginPercent}%</p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <p className="text-[10px] text-surface-300 uppercase tracking-wider font-semibold">Lucro Líquido no Período</p>
              <p className="text-2xl font-black text-white">{formatCurrency(dre.netRevenue)}</p>
            </div>
          </div>
        </div>

        {/* Barra de Distribuição Visual */}
        <div className="p-6 border-b border-surface-100 bg-surface-50/50">
          <div className="flex items-center justify-between text-xs font-bold mb-2">
            <span className="text-surface-700">Composição do Faturamento Bruto</span>
            <span className="text-surface-500">100% = {formatCurrency(dre.grossRevenue)}</span>
          </div>
          <div className="w-full h-4 rounded-full bg-surface-200 overflow-hidden flex">
            <div
              style={{ width: `${Math.min(100, dre.netMarginPercent)}%` }}
              className="bg-emerald-500 h-full transition-all duration-500"
              title={`Receita Líquida: ${dre.netMarginPercent}%`}
            />
            <div
              style={{
                width: `${dre.grossRevenue > 0 ? (dre.gatewayFees / dre.grossRevenue) * 100 : 0}%`,
              }}
              className="bg-amber-400 h-full transition-all duration-500"
              title={`Taxas Gateway: -${formatCurrency(dre.gatewayFees)}`}
            />
            <div
              style={{
                width: `${dre.grossRevenue > 0 ? (dre.refundsAmount / dre.grossRevenue) * 100 : 0}%`,
              }}
              className="bg-rose-500 h-full transition-all duration-500"
              title={`Estornos: -${formatCurrency(dre.refundsAmount)}`}
            />
          </div>
          <div className="flex flex-wrap items-center gap-6 mt-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
              <span className="text-surface-600 font-medium">
                Receita Líquida ({dre.netMarginPercent}%): <strong>{formatCurrency(dre.netRevenue)}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
              <span className="text-surface-600 font-medium">
                Taxas de Intermediação:{' '}
                <strong>
                  -{formatCurrency(dre.gatewayFees)} (
                  {dre.grossRevenue > 0 ? ((dre.gatewayFees / dre.grossRevenue) * 100).toFixed(1) : 0}%)
                </strong>
              </span>
            </div>
            {dre.refundsAmount > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                <span className="text-surface-600 font-medium">
                  Estornos & Reembolsos: <strong>-{formatCurrency(dre.refundsAmount)}</strong>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tabela Estruturada do DRE */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-100/70 border-b border-surface-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-bold text-surface-600 uppercase tracking-wider">
                  Linha do Demonstrativo (DRE)
                </th>
                <th className="text-center px-6 py-3 text-xs font-bold text-surface-600 uppercase tracking-wider">
                  Impacto
                </th>
                <th className="text-right px-6 py-3 text-xs font-bold text-surface-600 uppercase tracking-wider">
                  Valor (R$)
                </th>
                <th className="text-right px-6 py-3 text-xs font-bold text-surface-600 uppercase tracking-wider">
                  % sobre Bruto
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 font-medium">
              {/* (+) Receita Bruta */}
              <tr className="bg-white hover:bg-surface-50/50">
                <td className="px-6 py-3.5 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black">
                    +
                  </span>
                  <div>
                    <p className="font-bold text-surface-800">Receita Operacional Bruta</p>
                    <p className="text-xs text-surface-400">Total de pedidos aprovados e quitados no período</p>
                  </div>
                </td>
                <td className="px-6 py-3.5 text-center text-xs text-blue-600 font-bold">Crédito (+)</td>
                <td className="px-6 py-3.5 text-right font-black text-surface-900">
                  {formatCurrency(dre.grossRevenue)}
                </td>
                <td className="px-6 py-3.5 text-right font-bold text-surface-600">100.0%</td>
              </tr>

              {/* (-) Taxas de Intermediação */}
              <tr className="bg-white hover:bg-surface-50/50">
                <td className="px-6 py-3.5 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center text-xs font-black">
                    -
                  </span>
                  <div>
                    <p className="font-semibold text-surface-800">Deduções: Taxas de Gateways (Mercado Pago / PIX)</p>
                    <p className="text-xs text-surface-400">Processamento financeiro, MDR de cartão e split</p>
                  </div>
                </td>
                <td className="px-6 py-3.5 text-center text-xs text-amber-600 font-bold">Débito (-)</td>
                <td className="px-6 py-3.5 text-right font-bold text-amber-700">
                  -{formatCurrency(dre.gatewayFees)}
                </td>
                <td className="px-6 py-3.5 text-right text-xs text-surface-500">
                  {dre.grossRevenue > 0 ? ((dre.gatewayFees / dre.grossRevenue) * 100).toFixed(1) : 0}%
                </td>
              </tr>

              {/* (-) Estornos */}
              <tr className="bg-white hover:bg-surface-50/50">
                <td className="px-6 py-3.5 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center text-xs font-black">
                    -
                  </span>
                  <div>
                    <p className="font-semibold text-surface-800">Estornos, Reembolsos & Cancelamentos</p>
                    <p className="text-xs text-surface-400">Contestações ou devoluções no período</p>
                  </div>
                </td>
                <td className="px-6 py-3.5 text-center text-xs text-rose-600 font-bold">Débito (-)</td>
                <td className="px-6 py-3.5 text-right font-bold text-rose-700">
                  -{formatCurrency(dre.refundsAmount)}
                </td>
                <td className="px-6 py-3.5 text-right text-xs text-surface-500">
                  {dre.grossRevenue > 0 ? ((dre.refundsAmount / dre.grossRevenue) * 100).toFixed(1) : 0}%
                </td>
              </tr>

              {/* (=) Receita Líquida */}
              <tr className="bg-emerald-50/60 font-bold border-t-2 border-emerald-300">
                <td className="px-6 py-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center text-xs font-black">
                    =
                  </span>
                  <div>
                    <p className="text-base font-black text-emerald-900">RECEITA LÍQUIDA OPERACIONAL</p>
                    <p className="text-xs text-emerald-700 font-normal">Disponível em conta para reinvestimento e retiradas</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-center text-xs text-emerald-800 font-black">Resultado Líquido</td>
                <td className="px-6 py-4 text-right text-base font-black text-emerald-800">
                  {formatCurrency(dre.netRevenue)}
                </td>
                <td className="px-6 py-4 text-right font-black text-emerald-800">
                  {dre.netMarginPercent}%
                </td>
              </tr>

              {/* Linha Informativa: Perdas de Oportunidade */}
              <tr className="bg-surface-50/80 text-xs text-surface-500">
                <td className="px-6 py-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-black">
                    ℹ
                  </span>
                  <div>
                    <span className="font-bold text-surface-700">Custo de Oportunidade (Não Convertido):</span>{' '}
                    <span>{formatCurrency(dre.pendingRevenue)} em PIX pendentes + {formatCurrency(dre.rejectedRevenue)} em transações recusadas</span>
                  </div>
                </td>
                <td className="px-6 py-3 text-center font-bold text-slate-500">Potencial</td>
                <td className="px-6 py-3 text-right font-bold text-slate-700">
                  {formatCurrency(dre.lostRevenue)}
                </td>
                <td className="px-6 py-3 text-right font-bold text-amber-600">
                  {dre.potentialLostPercent}% do total gerado
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. COMPARATIVO MENSAL HISTÓRICO (ÚLTIMOS 6 MESES)
      ───────────────────────────────────────────────────────────── */}
      <div className="glass-card p-6 border border-surface-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <h3 className="font-black text-surface-900 text-lg">
                Comparativo Mensal de Desempenho (Últimos 6 Meses)
              </h3>
            </div>
            <p className="text-surface-400 text-xs mt-1">
              Evolução mês a mês de faturamento bruto vs faturamento líquido após custos.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-surface-400 font-semibold">Média Mensal</p>
              <p className="text-lg font-bold text-surface-800">
                {formatCurrency(
                  monthlyHistory.length > 0
                    ? monthlyHistory.reduce((acc, m) => acc + m.grossRevenue, 0) / monthlyHistory.length
                    : 0
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Gráfico de Barras */}
        <div className="h-72 relative w-full mb-6">
          <Bar data={monthlyChartData} options={monthlyChartOptions} />
        </div>

        {/* Tabela de Resumo Mês a Mês */}
        <div className="overflow-x-auto border-t border-surface-100 pt-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-surface-500 uppercase tracking-wider border-b border-surface-100">
                <th className="text-left py-2 font-bold">Mês</th>
                <th className="text-right py-2 font-bold">Faturamento Bruto</th>
                <th className="text-right py-2 font-bold">Faturamento Líquido</th>
                <th className="text-center py-2 font-bold">Vendas Aprovadas</th>
                <th className="text-right py-2 font-bold">Ticket Médio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 font-medium">
              {monthlyHistory.map((m) => (
                <tr key={m.monthKey} className="hover:bg-surface-50/50">
                  <td className="py-2.5 font-bold text-surface-800">{m.label}</td>
                  <td className="py-2.5 text-right font-bold text-blue-600">{formatCurrency(m.grossRevenue)}</td>
                  <td className="py-2.5 text-right font-bold text-emerald-600">{formatCurrency(m.netRevenue)}</td>
                  <td className="py-2.5 text-center text-surface-700">{m.salesCount} vendas</td>
                  <td className="py-2.5 text-right font-semibold text-surface-800">{formatCurrency(m.avgTicket)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. DIAGNÓSTICO ESTRATÉGICO ("ONDE TERIA QUE MELHORAR")
      ───────────────────────────────────────────────────────────── */}
      <div className="glass-card p-6 border-2 border-primary-200/60 bg-gradient-to-b from-white to-primary-50/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-primary-100 text-primary-700 text-lg">💡</span>
              <h3 className="font-black text-surface-900 text-lg">
                Diagnóstico Estratégico & Onde Melhorar
              </h3>
            </div>
            <p className="text-surface-500 text-xs mt-1">
              Plano de ação baseado no comportamento real de compra dos seus clientes no checkout.
            </p>
          </div>
          <span className="self-start md:self-auto text-xs font-bold px-3 py-1 bg-primary-100 text-primary-800 rounded-full border border-primary-200">
            Inteligência de Vendas Ativa
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {insights.map((item) => (
            <InsightCard key={item.id} item={item} />
          ))}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          6. TIMELINE NO PERÍODO & DISTRIBUIÇÃO DE MÉTODOS
      ───────────────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Timeline Chart */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-surface-800 text-lg">
                Evolução no Período ({getPeriodLabel()})
              </h3>
              <p className="text-surface-400 text-xs">
                {isHourly ? 'Faturamento hora a hora no dia selecionado' : 'Faturamento dia a dia'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-surface-900">
                {formatCurrency(dre.grossRevenue)}
              </p>
              <p className="text-xs text-emerald-600 font-semibold">
                no período selecionado
              </p>
            </div>
          </div>
          <div className="h-72 relative w-full">
            <Line data={revenueChartData} options={revenueChartOptions} />
          </div>
        </div>

        {/* Payment Methods Chart */}
        <div className="glass-card p-6">
          <h3 className="font-bold text-surface-800 text-lg mb-1">Métodos de Pagamento</h3>
          <p className="text-surface-400 text-xs mb-4">Volume e participação no período</p>
          <div className="h-56 relative w-full flex items-center justify-center">
            {paymentsByMethod.length > 0 ? (
              <Doughnut data={methodChartData} options={methodChartOptions} />
            ) : (
              <div className="text-center text-surface-400 text-xs">
                <span className="text-3xl block mb-2">📊</span>
                Aguardando novas transações para gerar o gráfico
              </div>
            )}
          </div>
          {/* Mini breakdown list */}
          <div className="mt-4 space-y-2 border-t border-surface-100 pt-3">
            {paymentsByMethod.map((p) => (
              <div key={p.method} className="flex items-center justify-between text-xs">
                <span className="font-semibold text-surface-700">{getMethodLabel(p.method)}</span>
                <span className="font-bold text-surface-900">
                  {formatCurrency(p.total)}{' '}
                  <span className="text-surface-400 font-normal">({p.percent}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          7. DESEMPENHO POR PRODUTO (RANKING & MARGENS)
      ───────────────────────────────────────────────────────────── */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-surface-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🏆</span>
              <h3 className="font-bold text-surface-800 text-lg">Performance por Produto</h3>
            </div>
            <p className="text-surface-400 text-xs mt-1">
              Faturamento, conversão individual e taxa de entrega automática de cada item.
            </p>
          </div>
          <Link
            href="/dashboard/products"
            className="self-start md:self-auto text-xs font-bold text-primary-600 hover:text-primary-700 underline"
          >
            Gerenciar Produtos & Entregas →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-50/70 border-b border-surface-200 text-surface-500 uppercase text-xs font-semibold">
                <th className="text-left px-6 py-3">Produto</th>
                <th className="text-left px-6 py-3">Tipo Entrega</th>
                <th className="text-right px-6 py-3">Receita Bruta</th>
                <th className="text-center px-6 py-3">Vendas Pagas</th>
                <th className="text-center px-6 py-3">Pendentes</th>
                <th className="text-center px-6 py-3">Taxa Conversão</th>
                <th className="text-center px-6 py-3">Entrega Automática</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 font-medium">
              {productsBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-surface-400 text-xs">
                    Nenhum produto com movimentação registrada neste período.
                  </td>
                </tr>
              ) : (
                productsBreakdown.map((prod) => (
                  <tr key={prod.id} className="hover:bg-surface-50/50">
                    <td className="px-6 py-4 flex items-center gap-3">
                      {prod.imageUrl ? (
                        <img
                          src={prod.imageUrl}
                          alt={prod.name}
                          className="w-10 h-10 rounded-lg object-cover border border-surface-200 shadow-sm"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-surface-100 border border-surface-200 flex items-center justify-center text-surface-400 text-lg font-bold">
                          📦
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-surface-800">{prod.name}</p>
                        <p className="text-[11px] text-surface-400">ID: {prod.id.slice(0, 8)}...</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="badge bg-primary-50 text-primary-700 border border-primary-200 text-[11px]">
                        {prod.deliveryType === 'AUTO_FILE' ? '📁 Arquivo Direto' : '🔗 Link Externo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-surface-900">
                      {formatCurrency(prod.grossRevenue)}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-emerald-700">
                      {prod.approvedSales}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-amber-700">
                      {prod.pendingSales}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold text-surface-800">{prod.conversionRate}%</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="badge bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                        ✓ {prod.deliveryRate}% entregue
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          8. TRANSAÇÕES RECENTES COM AÇÕES RÁPIDAS
      ───────────────────────────────────────────────────────────── */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-surface-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-surface-800 text-lg">Últimas Transações no Período</h3>
            <p className="text-surface-400 text-xs">
              Histórico detalhado com status de pagamento e pós-venda ({getPeriodLabel()})
            </p>
          </div>
          <Link
            href="/dashboard/payments"
            className="text-xs font-bold text-primary-600 hover:text-primary-700 underline"
          >
            Ver Todas as Transações →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-50/50 text-surface-500 uppercase text-xs font-semibold">
                <th className="text-left px-6 py-3">Cliente</th>
                <th className="text-left px-6 py-3">Produto</th>
                <th className="text-left px-6 py-3">Método</th>
                <th className="text-left px-6 py-3">Valor</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-left px-6 py-3">Entrega</th>
                <th className="text-left px-6 py-3">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 font-medium">
              {recentPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-surface-400">
                    <span className="text-3xl block mb-2">💳</span>
                    <p className="font-semibold text-surface-600">Nenhum pagamento registrado neste período.</p>
                    <p className="text-xs text-surface-400 mt-1">
                      Suas vendas aparecerão aqui em tempo real assim que forem geradas!
                    </p>
                  </td>
                </tr>
              ) : (
                recentPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-50/50">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-surface-800">{p.customerName}</p>
                      {p.customerPhone && (
                        <p className="text-[11px] text-surface-400">📱 {p.customerPhone}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-surface-600">{p.productName}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold text-surface-700">
                        {getMethodLabel(p.method)}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-surface-900">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(p.status)}</td>
                    <td className="px-6 py-4">
                      {p.deliveryStatus === 'DELIVERED' ? (
                        <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px]">
                          ✓ Entregue
                        </span>
                      ) : p.status === 'APPROVED' ? (
                        <span className="badge bg-amber-50 text-amber-700 border border-amber-200 text-[11px]">
                          ⏳ Pendente
                        </span>
                      ) : (
                        <span className="badge bg-slate-100 text-slate-500 text-[11px]">
                          -
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-surface-500">
                      {formatFullDate(p.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTES AUXILIARES
// ─────────────────────────────────────────────────────────────

function StatCardExecutive({
  title,
  value,
  growth,
  badgeText,
  badgeColor,
  icon,
  color,
  subtitle,
}: {
  title: string;
  value: string;
  growth?: number;
  badgeText?: string;
  badgeColor?: string;
  icon: string;
  color: string;
  subtitle: string;
}) {
  return (
    <div className="stat-card relative overflow-hidden group">
      <div
        className={`absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${color} opacity-10 group-hover:opacity-20 transition-opacity`}
      />
      <div className="flex items-start justify-between mb-2">
        <p className="text-[11px] font-bold text-surface-500 uppercase tracking-wider">{title}</p>
        <span className="text-2xl">{icon}</span>
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        <p className="text-2xl font-black text-surface-900 tracking-tight">{value}</p>
      </div>

      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        {growth !== undefined && (
          <span
            className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-md ${
              growth >= 0
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-rose-100 text-rose-800'
            }`}
          >
            {growth >= 0 ? '▲ +' : '▼ '}
            {growth}%
            <span className="text-[10px] font-normal opacity-80">vs período ant.</span>
          </span>
        )}

        {badgeText && (
          <span
            className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-md border ${
              badgeColor || 'bg-surface-100 text-surface-700 border-surface-200'
            }`}
          >
            {badgeText}
          </span>
        )}
      </div>

      <p className="text-[11px] text-surface-400 line-clamp-1">{subtitle}</p>
    </div>
  );
}

function InsightCard({ item }: { item: InsightItem }) {
  const borderStyles: Record<string, string> = {
    warning: 'border-amber-300 bg-amber-50/40',
    success: 'border-emerald-300 bg-emerald-50/40',
    info: 'border-blue-300 bg-blue-50/40',
    danger: 'border-rose-300 bg-rose-50/40',
  };

  const badgeStyles: Record<string, string> = {
    warning: 'bg-amber-100 text-amber-800 border-amber-300',
    success: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    info: 'bg-blue-100 text-blue-800 border-blue-300',
    danger: 'bg-rose-100 text-rose-800 border-rose-300',
  };

  return (
    <div
      className={`p-4 rounded-xl border transition-all hover:shadow-sm flex flex-col justify-between ${
        borderStyles[item.type] || 'border-surface-200 bg-white'
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${badgeStyles[item.type]}`}>
            {item.badge}
          </span>
          {item.metric && (
            <span className="text-xs font-black text-surface-800 bg-white/80 px-2 py-0.5 rounded border border-surface-200">
              {item.metric}
            </span>
          )}
        </div>
        <h4 className="text-sm font-bold text-surface-900 mb-1">{item.title}</h4>
        <p className="text-xs text-surface-600 leading-relaxed mb-3">{item.description}</p>
      </div>

      <div className="pt-2 border-t border-black/5 flex items-center gap-1.5 text-xs text-surface-700 font-semibold">
        <span className="text-primary-600">➔ Recomendação:</span>
        <span className="text-[11px] text-surface-600 font-normal">{item.actionRecommendation}</span>
      </div>
    </div>
  );
}
