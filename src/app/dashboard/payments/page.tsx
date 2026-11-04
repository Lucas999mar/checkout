'use client';

import { useEffect, useState } from 'react';

interface Payment {
  id: string;
  amount: number;
  status: string;
  mpPaymentMethodId: string;
  mpPaymentId: string;
  createdAt: string;
  paidAt: string | null;
  customer: { name: string; email: string } | null;
  product: { name: string } | null;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const formatDateTime = (d: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(d));

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', method: '', search: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchPayments();
  }, [page, filter]);

  async function fetchPayments() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '15');
      if (filter.status) params.set('status', filter.status);
      if (filter.method) params.set('method', filter.method);
      if (filter.search) params.set('search', filter.search);

      const res = await fetch(`/api/dashboard/payments?${params}`);
      const data = await res.json();
      setPayments(data.payments || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; label: string }> = {
      APPROVED: { bg: 'bg-green-100 text-green-700', label: 'Aprovado' },
      PENDING: { bg: 'bg-yellow-100 text-yellow-700', label: 'Pendente' },
      REJECTED: { bg: 'bg-red-100 text-red-700', label: 'Rejeitado' },
      CANCELLED: { bg: 'bg-gray-100 text-gray-700', label: 'Cancelado' },
      REFUNDED: { bg: 'bg-purple-100 text-purple-700', label: 'Reembolsado' },
      IN_PROCESS: { bg: 'bg-blue-100 text-blue-700', label: 'Em Processo' },
      EXPIRED: { bg: 'bg-gray-100 text-gray-500', label: 'Expirado' },
    };
    const s = map[status] || { bg: 'bg-gray-100 text-gray-700', label: status };
    return <span className={`badge ${s.bg}`}>{s.label}</span>;
  };

  const getMethodIcon = (m: string) => {
    const icons: Record<string, string> = { pix: '🟢', visa: '💳', master: '💳', bolbradesco: '📄' };
    return icons[m] || '💳';
  };

  const getMethodLabel = (m: string) => {
    const labels: Record<string, string> = { pix: 'PIX', visa: 'Visa', master: 'Master', bolbradesco: 'Boleto' };
    return labels[m] || m || 'N/A';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Filters */}
      <div className="glass-card p-6">
        <div className="grid sm:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Buscar por cliente ou ID..."
            value={filter.search}
            onChange={(e) => { setFilter({ ...filter, search: e.target.value }); setPage(1); }}
            className="input-field"
          />
          <select
            value={filter.status}
            onChange={(e) => { setFilter({ ...filter, status: e.target.value }); setPage(1); }}
            className="input-field"
          >
            <option value="">Todos os status</option>
            <option value="APPROVED">Aprovado</option>
            <option value="PENDING">Pendente</option>
            <option value="REJECTED">Rejeitado</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
          <select
            value={filter.method}
            onChange={(e) => { setFilter({ ...filter, method: e.target.value }); setPage(1); }}
            className="input-field"
          >
            <option value="">Todos os métodos</option>
            <option value="pix">PIX</option>
            <option value="visa">Visa</option>
            <option value="master">Mastercard</option>
            <option value="bolbradesco">Boleto</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin mx-auto" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-50/50">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase">ID MP</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase">Cliente</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase">Produto</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase">Método</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase">Valor</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase">Status</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="table-row">
                      <td className="px-6 py-4 text-sm font-mono text-surface-500">
                        {p.mpPaymentId ? `#${p.mpPaymentId}` : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-surface-700">{p.customer?.name || 'N/A'}</p>
                          <p className="text-xs text-surface-400">{p.customer?.email || ''}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-surface-500">{p.product?.name || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1.5">
                          {getMethodIcon(p.mpPaymentMethodId)}
                          <span className="text-sm">{getMethodLabel(p.mpPaymentMethodId)}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-surface-700">{formatCurrency(p.amount)}</td>
                      <td className="px-6 py-4">{getStatusBadge(p.status)}</td>
                      <td className="px-6 py-4 text-sm text-surface-500">{formatDateTime(p.createdAt)}</td>
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-surface-400">
                        Nenhum pagamento encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-surface-100 flex items-center justify-between">
                <p className="text-sm text-surface-500">
                  Página {page} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="btn-secondary py-2 px-4 text-sm disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                    className="btn-secondary py-2 px-4 text-sm disabled:opacity-50"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
