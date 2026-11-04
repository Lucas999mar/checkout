'use client';

import { useEffect, useState } from 'react';
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
  overview: {
    totalRevenue: number;
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

const formatDate = (d: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(d));

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
  return labels[m] || m || 'N/A';
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard/stats');
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
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

  const { overview, paymentsByMethod, dailyRevenue, recentPayments } = stats;

  // Revenue chart data
  const revenueChartData = {
    labels: dailyRevenue.map((d) => formatDate(d.date)),
    datasets: [
      {
        label: 'Receita (R$)',
        data: dailyRevenue.map((d) => d.total),
        fill: true,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        borderWidth: 2.5,
        tension: 0.4,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
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
        ticks: { color: '#94a3b8', font: { size: 11 } },
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
    labels: paymentsByMethod.map((p) => getMethodLabel(p.method)),
    datasets: [
      {
        data: paymentsByMethod.map((p) => p.count),
        backgroundColor: methodColors.slice(0, paymentsByMethod.length),
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

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Stats Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Receita Total"
          value={formatCurrency(overview.totalRevenue)}
          icon="💰"
          color="from-green-500 to-emerald-600"
          subtitle={`${formatCurrency(overview.monthRevenue)} este mês`}
        />
        <StatCard
          title="Pagamentos"
          value={overview.totalPayments.toString()}
          icon="📊"
          color="from-blue-500 to-indigo-600"
          subtitle={`${overview.approvedPayments} aprovados`}
        />
        <StatCard
          title="Clientes"
          value={overview.totalCustomers.toString()}
          icon="👥"
          color="from-purple-500 to-violet-600"
          subtitle={`${overview.activeSubscriptions} assinaturas ativas`}
        />
        <StatCard
          title="Taxa de Conversão"
          value={`${overview.conversionRate}%`}
          icon="📈"
          color="from-amber-500 to-orange-600"
          subtitle={`${overview.pendingPayments} pendentes`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-surface-800 text-lg">Receita (30 dias)</h3>
              <p className="text-surface-400 text-sm">Evolução diária da receita aprovada</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-surface-800">
                {formatCurrency(overview.monthRevenue)}
              </p>
              <p className="text-sm text-accent-600 font-medium">
                {formatCurrency(overview.weekRevenue)} esta semana
              </p>
            </div>
          </div>
          <div className="h-72 relative w-full">
            <Line data={revenueChartData} options={revenueChartOptions} />
          </div>
        </div>

        {/* Payment Methods Chart */}
        <div className="glass-card p-6">
          <h3 className="font-bold text-surface-800 text-lg mb-2">Métodos de Pagamento</h3>
          <p className="text-surface-400 text-sm mb-6">Distribuição por método</p>
          <div className="h-64 relative w-full flex items-center justify-center">
            <Doughnut data={methodChartData} options={methodChartOptions} />
          </div>
        </div>
      </div>

      {/* Recent Payments Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-surface-100">
          <h3 className="font-bold text-surface-800 text-lg">Últimos Pagamentos</h3>
          <p className="text-surface-400 text-sm">10 transações mais recentes</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-50/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                  Produto
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
                    <p className="font-semibold text-surface-600">Nenhum pagamento registrado ainda.</p>
                    <p className="text-xs text-surface-400 mt-1">Suas vendas reais aparecerão aqui em tempo real conforme forem efetuadas!</p>
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
          <p className="text-sm font-medium text-surface-500">{title}</p>
          <p className="text-2xl font-bold text-surface-800 mt-1">{value}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-xs text-surface-400">{subtitle}</p>
    </div>
  );
}
