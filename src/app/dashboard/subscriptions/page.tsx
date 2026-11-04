'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface Subscription {
  id: string;
  mpPreapprovalId: string | null;
  status: string;
  startDate: string;
  endDate: string | null;
  nextBillingDate: string | null;
  customer: { name: string; email: string };
  product: { name: string };
  price: { amount: number; interval: string | null };
  createdAt: string;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatDate = (d: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(d));

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ active: 0, pending: 0, cancelled: 0 });

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  async function fetchSubscriptions() {
    try {
      const res = await fetch('/api/dashboard/subscriptions');
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data.subscriptions || []);
        setStats(data.stats || { active: 0, pending: 0, cancelled: 0 });
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(id: string) {
    if (!confirm('Deseja cancelar esta assinatura?')) return;
    try {
      const res = await fetch(`/api/dashboard/subscriptions/${id}/cancel`, { method: 'POST' });
      if (!res.ok) throw new Error('Erro ao cancelar');
      toast.success('Assinatura cancelada');
      fetchSubscriptions();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; label: string }> = {
      ACTIVE: { bg: 'bg-green-100 text-green-700', label: 'Ativa' },
      PENDING: { bg: 'bg-yellow-100 text-yellow-700', label: 'Pendente' },
      PAUSED: { bg: 'bg-blue-100 text-blue-700', label: 'Pausada' },
      CANCELLED: { bg: 'bg-red-100 text-red-700', label: 'Cancelada' },
      EXPIRED: { bg: 'bg-gray-100 text-gray-500', label: 'Expirada' },
    };
    const s = map[status] || { bg: 'bg-gray-100 text-gray-700', label: status };
    return <span className={`badge ${s.bg}`}>{s.label}</span>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glass-card p-6">
        <h3 className="font-bold text-surface-800 text-lg mb-2">Assinaturas Recorrentes</h3>
        <p className="text-surface-500 text-sm mb-6">
          Gerencie planos recorrentes com Mercado Pago Preapproval API.
          As assinaturas são criadas quando clientes pagam via links de pagamento recorrentes.
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="p-4 bg-surface-50 rounded-xl text-center">
            <p className="text-2xl font-bold text-surface-800">{stats.active}</p>
            <p className="text-sm text-surface-500">Assinaturas Ativas</p>
          </div>
          <div className="p-4 bg-surface-50 rounded-xl text-center">
            <p className="text-2xl font-bold text-surface-800">{stats.pending}</p>
            <p className="text-sm text-surface-500">Pendentes</p>
          </div>
          <div className="p-4 bg-surface-50 rounded-xl text-center">
            <p className="text-2xl font-bold text-surface-800">{stats.cancelled}</p>
            <p className="text-sm text-surface-500">Canceladas</p>
          </div>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin mx-auto" />
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="p-12 text-center text-surface-400">
            <p className="text-4xl mb-3">🔄</p>
            <p className="text-lg font-medium mb-1">Nenhuma assinatura encontrada</p>
            <p className="text-sm">Assinaturas serão criadas quando clientes pagarem links recorrentes.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-50/50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase">Cliente</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase">Produto</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase">Valor</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase">Início</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase">Próx. Cobrança</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="table-row">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-surface-700">{sub.customer.name}</p>
                        <p className="text-xs text-surface-400">{sub.customer.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-surface-500">{sub.product.name}</td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-surface-700">
                        {formatCurrency(sub.price.amount)}
                        <span className="font-normal text-surface-400">
                          /{sub.price.interval === 'month' ? 'mês' : 'ano'}
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(sub.status)}</td>
                    <td className="px-6 py-4 text-sm text-surface-500">{formatDate(sub.startDate)}</td>
                    <td className="px-6 py-4 text-sm text-surface-500">
                      {sub.nextBillingDate ? formatDate(sub.nextBillingDate) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {sub.status !== 'CANCELLED' && sub.status !== 'EXPIRED' && (
                        <button
                          onClick={() => handleCancel(sub.id)}
                          className="text-xs bg-red-50 text-red-600 hover:bg-red-100 font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          Cancelar Assinatura
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
