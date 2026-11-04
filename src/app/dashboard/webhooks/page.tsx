'use client';

import { useEffect, useState } from 'react';

interface WebhookLog {
  id: string;
  eventType: string;
  mpId: string;
  status: string;
  payload: any;
  error: string | null;
  processedAt: string | null;
  createdAt: string;
}

const formatDateTime = (d: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(d));

export default function WebhooksPage() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState({ status: '', eventType: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchLogs();
  }, [page, filter]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '20');
      if (filter.status) params.set('status', filter.status);
      if (filter.eventType) params.set('eventType', filter.eventType);

      const res = await fetch(`/api/dashboard/webhooks?${params}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; label: string }> = {
      PROCESSED: { bg: 'bg-green-100 text-green-700', label: 'Processado' },
      PENDING: { bg: 'bg-yellow-100 text-yellow-700', label: 'Pendente' },
      FAILED: { bg: 'bg-red-100 text-red-700', label: 'Falhou' },
      IGNORED: { bg: 'bg-gray-100 text-gray-500', label: 'Ignorado' },
    };
    const s = map[status] || { bg: 'bg-gray-100 text-gray-700', label: status };
    return <span className={`badge ${s.bg}`}>{s.label}</span>;
  };

  const getEventIcon = (type: string) => {
    if (type.includes('payment')) return '💰';
    if (type.includes('subscription') || type.includes('preapproval')) return '🔄';
    if (type.includes('chargeback')) return '⚠️';
    return '📡';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Filters */}
      <div className="glass-card p-6">
        <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
          <select
            value={filter.status}
            onChange={(e) => {
              setFilter({ ...filter, status: e.target.value });
              setPage(1);
            }}
            className="input-field"
          >
            <option value="">Todos os status</option>
            <option value="PROCESSED">Processado</option>
            <option value="PENDING">Pendente</option>
            <option value="FAILED">Falhou</option>
            <option value="IGNORED">Ignorado</option>
          </select>
          <select
            value={filter.eventType}
            onChange={(e) => {
              setFilter({ ...filter, eventType: e.target.value });
              setPage(1);
            }}
            className="input-field"
          >
            <option value="">Todos os eventos</option>
            <option value="payment">Pagamento</option>
            <option value="preapproval">Assinatura</option>
            <option value="chargeback">Chargeback</option>
          </select>
        </div>
      </div>

      {/* Logs */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin mx-auto" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-surface-400">
            <p className="text-4xl mb-3">📡</p>
            <p className="text-lg font-medium mb-1">Nenhum webhook registrado</p>
            <p className="text-sm">Os webhooks do Mercado Pago aparecerão aqui quando recebidos.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-50/50">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase">
                      Evento
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase">
                      ID MP
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase">
                      Status
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase">
                      Erro
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase">
                      Recebido
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase">
                      Processado
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase">
                      Detalhes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <>
                      <tr key={log.id} className="table-row">
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-2">
                            <span>{getEventIcon(log.eventType)}</span>
                            <span className="text-sm font-medium text-surface-700">
                              {log.eventType}
                            </span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-mono text-surface-500">
                          {log.mpId}
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(log.status)}</td>
                        <td className="px-6 py-4">
                          {log.error ? (
                            <span className="text-sm text-red-600 truncate max-w-[200px] block">
                              {log.error}
                            </span>
                          ) : (
                            <span className="text-sm text-surface-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-surface-500">
                          {formatDateTime(log.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-sm text-surface-500">
                          {log.processedAt ? formatDateTime(log.processedAt) : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() =>
                              setExpandedId(expandedId === log.id ? null : log.id)
                            }
                            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                          >
                            {expandedId === log.id ? 'Ocultar' : 'Ver payload'}
                          </button>
                        </td>
                      </tr>
                      {expandedId === log.id && (
                        <tr key={`${log.id}-details`}>
                          <td colSpan={7} className="px-6 py-4 bg-surface-50">
                            <pre className="text-xs text-surface-600 overflow-x-auto p-4 bg-white rounded-xl border border-surface-100 max-h-64">
                              {JSON.stringify(log.payload, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
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
