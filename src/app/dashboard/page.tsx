'use client';

import { useEffect, useState, useCallback } from 'react';
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
import { Line, Doughnut } from 'react-chartjs-2';
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

interface DashboardStats {
  period?: string;
  isHourly?: boolean;
  periodStart?: string;
  periodEnd?: string;
  overview: {
    totalRevenue: number;
    periodRevenue?: number;
    monthRevenue: number;
    weekRevenue: number;
    totalPayments: number;
    approvedPayments: number;
    pendingPayments: number;
    totalCustomers: number;
    totalProducts: number;
    activeLinks: number;
    totalSubscriptions: number;
    activeSubscriptions: number;
    conversionRate: number;
  };
  paymentsByMethod: Array<{ method: string; count: number; total: number }>;
  dailyRevenue: Array<{ date: string; total: number }>;
  recentPayments: Array<{
    id: string;
    amount: number;
    status: string;
    method: string;
    customerName: string;
    productName: string;
    createdAt: string;
    paidAt: string | null;
  }>;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

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

const getStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    APPROVED: 'bg-green-100 text-green-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    REJECTED: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = {
    APPROVED: 'Aprovado',
    PENDING: 'Pendente',
    REJECTED: 'Rejeitado',
  };
  return (
    <span className={`badge ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {labels[status] || status}
    </span>
  );
};

const getMethodLabel = (m: string) => {
  const labels: Record<string, string> = {
    pix: 'PIX',
    visa: 'Visa',
    master: 'Master',
    bolbradesco: 'Boleto',
    elo: 'Elo',
    amex: 'Amex',
  };
  return labels[m] || m || 'PIX';
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
      toast.error('Erro ao carregar dados do dashboard');
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
      case 'today': return 'Hoje';
      case 'yesterday': return 'Ontem';
      case '7d': return 'Últimos 7 dias';
      case '30d': return 'Últimos 30 dias';
      case '90d': return 'Últimos 90 dias';
      case 'this_month': return 'Este Mês';
      case 'this_year': return 'Este Ano';
      case 'custom': return 'Período Personalizado';
      default: return 'Últimos 30 dias';
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

  const { overview, paymentsByMethod, dailyRevenue, recentPayments, isHourly } = stats;

  // Revenue chart data
  const revenueChartData = {
    labels: dailyRevenue.map((d) => (isHourly ? d.date : formatDate(d.date))),
    datasets: [
      {
        label: 'Receita (R$)',
        data: dailyRevenue.map((d) => d.total),
        fill: true,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        borderWidth: 2.5,
        tension: 0.35,
        pointBackgroundColor: '#3b82f6',
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
        backgroundColor: '#1e293b',
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: any) => ` R$ ${ctx.parsed.y.toFixed(2)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { size: 11 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
      },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: {
          color: '#94a3b8',
          font: { size: 11 },
          callback: (value: any) => `R$ ${value}`,
        },
      },
    },
  };

  // Payment methods chart
  const methodColors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const methodChartData = {
    labels: paymentsByMethod.length > 0 ? paymentsByMethod.map((p) => getMethodLabel(p.method)) : ['Sem dados'],
    datasets: [
      {
        data: paymentsByMethod.length > 0 ? paymentsByMethod.map((p) => p.count) : [1],
        backgroundColor: paymentsByMethod.length > 0 ? methodColors.slice(0, paymentsByMethod.length) : ['#e2e8f0'],
        borderWidth: 0,
        hoverOffset: 8,
      },
    ],
  };

  const methodChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { padding: 16, usePointStyle: true, pointStyle: 'circle', font: { size: 12 } },
      },
    },
    cutout: '65%',
  };

  const periodRevenueValue = overview.periodRevenue !== undefined ? overview.periodRevenue : overview.totalRevenue;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Date Filter Bar */}
      <div className="glass-card p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-surface-800">Visão Geral</h2>
          <p className="text-xs text-surface-500 font-medium">
            Exibindo dados de: <strong className="text-primary-700">{getPeriodLabel()}</strong>
          </p>
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-surface-100 p-1.5 rounded-xl border border-surface-200">
          {[
            { id: 'today', label: 'Hoje' },
            { id: 'yesterday', label: 'Ontem' },
            { id: '7d', label: '7 Dias' },
            { id: '30d', label: '30 Dias' },
            { id: '90d', label: '90 Dias' },
            { id: 'this_month', label: 'Este Mês' },
            { id: 'this_year', label: 'Este Ano' },
            { id: 'custom', label: '📅 Personalizado' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handlePeriodChange(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                period === item.id
                  ? 'bg-white text-primary-600 shadow-sm border border-surface-200'
                  : 'text-surface-600 hover:text-surface-900 hover:bg-surface-200/50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Pickers (Shown when Personalizado is clicked) */}
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
            Filtrar Período
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title={`Receita (${getPeriodLabel()})`}
          value={formatCurrency(periodRevenueValue)}
          icon="💰"
          color="from-green-500 to-emerald-600"
          subtitle={`Total acumulado geral: ${formatCurrency(overview.totalRevenue)}`}
        />
        <StatCard
          title="Pagamentos no Período"
          value={overview.totalPayments.toString()}
          icon="📊"
          color="from-blue-500 to-indigo-600"
          subtitle={`${overview.approvedPayments} aprovados (${overview.pendingPayments} pendentes)`}
        />
        <StatCard
          title="Clientes Ativos"
          value={overview.totalCustomers.toString()}
          icon="👥"
          color="from-purple-500 to-violet-600"
          subtitle={`${overview.activeSubscriptions} assinaturas recorrentes`}
        />
        <StatCard
          title="Taxa de Conversão"
          value={`${overview.conversionRate}%`}
          icon="📈"
          color="from-amber-500 to-orange-600"
          subtitle={`${overview.approvedPayments} de ${overview.totalPayments} pagamentos`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Timeline Chart */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-surface-800 text-lg">
                Evolução da Receita ({getPeriodLabel()})
              </h3>
              <p className="text-surface-400 text-sm">
                {isHourly ? 'Valores aprovados hora a hora no dia selecionado' : 'Valores aprovados dia a dia'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-surface-800">
                {formatCurrency(periodRevenueValue)}
              </p>
              <p className="text-xs text-accent-600 font-semibold">
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
          <p className="text-surface-400 text-xs mb-6">Distribuição no período ({getPeriodLabel()})</p>
          <div className="h-64 relative w-full flex items-center justify-center">
            {paymentsByMethod.length > 0 ? (
              <Doughnut data={methodChartData} options={methodChartOptions} />
            ) : (
              <div className="text-center text-surface-400 text-xs">
                <span className="text-3xl block mb-2">📊</span>
                Aguardando novas transações para gerar o gráfico
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Payments Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-surface-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-surface-800 text-lg">Transações Recentes</h3>
            <p className="text-surface-400 text-xs">
              Filtrando transações do período ({getPeriodLabel()})
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-50/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                  Produto / Link
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                  Método
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                  Data
                </th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-surface-400">
                    <span className="text-3xl block mb-2">💳</span>
                    <p className="font-semibold text-surface-600">Nenhum pagamento registrado neste período.</p>
                    <p className="text-xs text-surface-400 mt-1">
                      Suas vendas reais aparecerão aqui em tempo real assim que forem efetuadas!
                    </p>
                  </td>
                </tr>
              ) : (
                recentPayments.map((p) => (
                  <tr key={p.id} className="table-row">
                    <td className="px-6 py-4">
                      <span className="font-medium text-surface-700">{p.customerName}</span>
                    </td>
                    <td className="px-6 py-4 text-surface-500">{p.productName}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-surface-600">{getMethodLabel(p.method)}</span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-surface-700">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(p.status)}</td>
                    <td className="px-6 py-4 text-sm text-surface-500">
                      {formatDate(p.createdAt)}
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

function StatCard({
  title,
  value,
  icon,
  color,
  subtitle,
}: {
  title: string;
  value: string;
  icon: string;
  color: string;
  subtitle: string;
}) {
  return (
    <div className="stat-card relative overflow-hidden group">
      <div className={`absolute -top-4 -right-4 w-24 h-24 rounded-full bg-gradient-to-br ${color} opacity-10 group-hover:opacity-20 transition-opacity`} />
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-surface-800 mt-1">{value}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-xs text-surface-400">{subtitle}</p>
    </div>
  );
}
