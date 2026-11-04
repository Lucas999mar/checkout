'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface Price {
  id: string;
  amount: number;
  type: string;
  interval: string | null;
  intervalCount: number | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  prices: Price[];
  _count: { payments: number; paymentLinks: number };
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prices: [{ amount: 0, type: 'ONE_TIME', interval: '', intervalCount: 1 }],
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      const res = await fetch('/api/dashboard/products');
      const data = await res.json();
      setProducts(data.products || []);
    } catch {} finally {
      setLoading(false);
    }
  }

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/dashboard/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Erro ao criar produto');
      toast.success('Produto criado com sucesso!');
      setShowForm(false);
      setFormData({ name: '', description: '', prices: [{ amount: 0, type: 'ONE_TIME', interval: '', intervalCount: 1 }] });
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  const addPrice = () => {
    setFormData({
      ...formData,
      prices: [...formData.prices, { amount: 0, type: 'ONE_TIME', interval: '', intervalCount: 1 }],
    });
  };

  const removePrice = (index: number) => {
    setFormData({
      ...formData,
      prices: formData.prices.filter((_, i) => i !== index),
    });
  };

  const updatePrice = (index: number, field: string, value: any) => {
    const newPrices = [...formData.prices];
    (newPrices[index] as any)[field] = value;
    setFormData({ ...formData, prices: newPrices });
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Deseja excluir este produto?')) return;
    try {
      const res = await fetch(`/api/dashboard/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Produto excluído com sucesso');
      fetchProducts();
    } catch {
      toast.error('Erro ao excluir produto');
    }
  };

  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="glass-card p-6 space-y-3">
            <div className="skeleton h-6 w-32 rounded" />
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-10 w-24 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-surface-500">{products.length} produto(s) cadastrado(s)</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? '✕ Cancelar' : '+ Novo Produto'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="glass-card p-6 animate-slide-up">
          <h3 className="font-bold text-surface-800 text-lg mb-4">Criar Produto</h3>
          <form onSubmit={handleCreateProduct} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-600 mb-1">Nome</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="Nome do produto"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-600 mb-1">Descrição</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  placeholder="Descrição do produto"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-surface-600">Preços</label>
                <button type="button" onClick={addPrice} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                  + Adicionar preço
                </button>
              </div>
              {formData.prices.map((price, idx) => (
                <div key={idx} className="flex gap-3 mb-3 items-end">
                  <div className="flex-1">
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={price.amount || ''}
                      onChange={(e) => updatePrice(idx, 'amount', parseFloat(e.target.value))}
                      className="input-field"
                      placeholder="Valor (R$)"
                    />
                  </div>
                  <div className="w-40">
                    <select
                      value={price.type}
                      onChange={(e) => updatePrice(idx, 'type', e.target.value)}
                      className="input-field"
                    >
                      <option value="ONE_TIME">Único</option>
                      <option value="RECURRING">Recorrente</option>
                    </select>
                  </div>
                  {price.type === 'RECURRING' && (
                    <div className="w-32">
                      <select
                        value={price.interval || 'month'}
                        onChange={(e) => updatePrice(idx, 'interval', e.target.value)}
                        className="input-field"
                      >
                        <option value="month">Mensal</option>
                        <option value="year">Anual</option>
                      </select>
                    </div>
                  )}
                  {formData.prices.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePrice(idx)}
                      className="p-3 text-red-500 hover:bg-red-50 rounded-xl"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button type="submit" className="btn-primary">Criar Produto</button>
          </form>
        </div>
      )}

      {/* Products grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div key={product.id} className="glass-card p-6 hover:shadow-card-hover transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center text-xl">
                📦
              </div>
              <span className={`badge ${product.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {product.active ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <h3 className="font-bold text-surface-800 text-lg mb-1">{product.name}</h3>
            <p className="text-surface-500 text-sm mb-4 line-clamp-2">{product.description || 'Sem descrição'}</p>

            <div className="space-y-2 mb-4">
              {product.prices.map((price) => (
                <div key={price.id} className="flex items-center justify-between p-2 bg-surface-50 rounded-lg">
                  <span className="text-sm text-surface-500">
                    {price.type === 'RECURRING'
                      ? `${price.interval === 'month' ? 'Mensal' : 'Anual'}`
                      : 'Único'}
                  </span>
                  <span className="font-bold text-surface-700">{formatCurrency(price.amount)}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-sm text-surface-400 pt-3 border-t border-surface-100">
              <div className="flex gap-3 text-xs">
                <span>{product._count.payments} vendas</span>
                <span>•</span>
                <span>{product._count.paymentLinks} links</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="/dashboard/payment-links"
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 px-2.5 py-1 rounded-lg"
                >
                  + Criar Link
                </a>
                <button
                  onClick={() => handleDeleteProduct(product.id)}
                  className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded-lg"
                  title="Excluir produto"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}

        {products.length === 0 && (
          <div className="col-span-full text-center py-12 text-surface-400">
            <p className="text-4xl mb-3">📦</p>
            <p>Nenhum produto cadastrado</p>
          </div>
        )}
      </div>
    </div>
  );
}
