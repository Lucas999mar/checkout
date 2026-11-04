'use client';

import { useEffect, useState } from 'react';

interface Customer {
  id: string;
  name: string;
  email: string;
  cpf: string | null;
  phone: string | null;
  createdAt: string;
  _count: { payments: number; subscriptions: number };
  totalSpent: number;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatDate = (d: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(d));

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchCustomers();
  }, [page, search]);

  async function fetchCustomers() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '20');
      if (search) params.set('search', search);

      const res = await fetch(`/api/dashboard/customers?${params}`);
      const data = await res.json();
      setCustomers(data.customers || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search */}
      <div className="glass-card p-6">
        <div className="max-w-md">
          <input
            type="text"
            placeholder="Buscar por nome, e-mail ou CPF..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="input-field"
          />
        </div>
      </div>

      {/* Customers Table */}
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
                    <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase">
                      Cliente
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase">
                      CPF
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase">
                      Telefone
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase">
                      Pagamentos
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase">
                      Total Gasto
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase">
                      Assinaturas
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase">
                      Cadastro
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} className="table-row">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-surface-700">{c.name}</p>
                            <p className="text-xs text-surface-400">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-surface-500 font-mono">
                        {c.cpf || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-surface-500">
                        {c.phone || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="badge bg-blue-100 text-blue-700">
                          {c._count.payments}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-surface-700">
                        {formatCurrency(c.totalSpent)}
                      </td>
                      <td className="px-6 py-4">
                        {c._count.subscriptions > 0 ? (
                          <span className="badge bg-green-100 text-green-700">
                            {c._count.subscriptions} ativa(s)
                          </span>
                        ) : (
                          <span className="text-sm text-surface-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-surface-500">
                        {formatDate(c.createdAt)}
                      </td>
                    </tr>
                  ))}
                  {customers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-surface-400">
                        <p className="text-4xl mb-3">👥</p>
                        <p>Nenhum cliente encontrado</p>
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
