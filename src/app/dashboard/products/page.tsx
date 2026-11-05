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
  deliveryType?: string;
  deliveryUrl?: string | null;
  deliveryContent?: string | null;
  deliveryInstructions?: string | null;
  notifyEmail?: boolean;
  notifyWhatsapp?: boolean;
  prices: Price[];
  _count: { payments: number; paymentLinks: number };
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const initialForm = {
    name: '',
    description: '',
    prices: [{ amount: 0, type: 'ONE_TIME', interval: '', intervalCount: 1 }],
    deliveryType: 'DOWNLOAD', // 'DOWNLOAD' | 'ACCESS_LINK' | 'VIDEO' | 'CUSTOM_TEXT' | 'NONE'
    deliveryUrl: '',
    deliveryContent: '',
    deliveryInstructions: '',
    notifyEmail: true,
    notifyWhatsapp: true,
  };

  const [formData, setFormData] = useState(initialForm);

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
      toast.success('Produto criado com sucesso com entrega automática configurada!');
      setShowForm(false);
      setFormData(initialForm);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleUpdateProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      const res = await fetch(`/api/dashboard/products/${editingProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingProduct.name,
          description: editingProduct.description,
          deliveryType: editingProduct.deliveryType,
          deliveryUrl: editingProduct.deliveryUrl,
          deliveryContent: editingProduct.deliveryContent,
          deliveryInstructions: editingProduct.deliveryInstructions,
          notifyEmail: editingProduct.notifyEmail,
          notifyWhatsapp: editingProduct.notifyWhatsapp,
        }),
      });
      if (!res.ok) throw new Error('Erro ao atualizar produto');
      toast.success('Produto e dados de entrega atualizados!');
      setEditingProduct(null);
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

  const getDeliveryBadge = (type?: string) => {
    switch (type) {
      case 'DOWNLOAD':
        return { label: '📥 PDF / Arquivo', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'VIDEO':
        return { label: '🎬 Vídeo / Aulas', bg: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'ACCESS_LINK':
        return { label: '🎓 Curso / Área VIP', bg: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'CUSTOM_TEXT':
        return { label: '🔑 Chave / Acesso', bg: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'NONE':
        return { label: '⚪ Sem Entrega', bg: 'bg-gray-100 text-gray-700 border-gray-200' };
      default:
        return { label: '📦 Infoproduto', bg: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-surface-800">Produtos & Infoprodutos</h2>
          <p className="text-surface-500 text-sm">
            {products.length} produto(s) cadastrado(s) com entrega digital instantânea para WhatsApp e E-mail.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/dashboard/deliveries"
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <span>🚀</span> Ver Disparos de Entrega
          </a>
          <button
            onClick={() => {
              setEditingProduct(null);
              setShowForm(!showForm);
            }}
            className="btn-primary"
          >
            {showForm ? '✕ Cancelar' : '+ Novo Produto'}
          </button>
        </div>
      </div>

      {/* Modal / Painel de Edição de Produto */}
      {editingProduct && (
        <div className="glass-card p-6 border-2 border-primary-200 shadow-xl animate-slide-up">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-surface-100">
            <div>
              <h3 className="font-bold text-surface-800 text-lg">
                Editar Entrega Automática: <span className="text-primary-600">{editingProduct.name}</span>
              </h3>
              <p className="text-xs text-surface-500">Configure o conteúdo que será disparado via WhatsApp e E-mail após a compra.</p>
            </div>
            <button
              onClick={() => setEditingProduct(null)}
              className="text-surface-400 hover:text-surface-700 text-sm font-semibold p-1"
            >
              ✕ Fechar
            </button>
          </div>

          <form onSubmit={handleUpdateProduct} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-surface-600 mb-1">Nome do Produto</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-600 mb-1">Descrição</label>
                <input
                  type="text"
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>

            {/* Configuração de Entrega do Infoproduto */}
            <div className="p-4 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 rounded-xl border border-blue-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-blue-900 flex items-center gap-2">
                  <span>🚀</span> Configuração da Entrega Digital
                </span>
                <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2.5 py-0.5 rounded-full">
                  Disparo Automático Imediato
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">Tipo de Entrega</label>
                  <select
                    value={editingProduct.deliveryType || 'DOWNLOAD'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, deliveryType: e.target.value })}
                    className="input-field bg-white"
                  >
                    <option value="DOWNLOAD">📥 Download de Arquivo / PDF / Documento</option>
                    <option value="ACCESS_LINK">🎓 Curso / Área de Membros / Link de Acesso</option>
                    <option value="VIDEO">🎬 Vídeo / Aulas Exclusivas (Vimeo, YouTube, Drive)</option>
                    <option value="CUSTOM_TEXT">🔑 Chave de Ativação / Licença / Senha</option>
                    <option value="NONE">⚪ Nenhum (Apenas Cobrança)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Link do Arquivo / PDF / Área de Membros
                  </label>
                  <input
                    type="url"
                    value={editingProduct.deliveryUrl || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, deliveryUrl: e.target.value })}
                    className="input-field bg-white"
                    placeholder="https://drive.google.com/... ou https://seucurso.com/login"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Chaves de Acesso / Senhas / Dados de Login (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={editingProduct.deliveryContent || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, deliveryContent: e.target.value })}
                  className="input-field bg-white font-mono text-xs"
                  placeholder="Ex: Usuário: aluno@email.com | Chave: PRO-8492-VIP"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Instruções Adicionais para o Aluno / Cliente (Opcional)
                </label>
                <input
                  type="text"
                  value={editingProduct.deliveryInstructions || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, deliveryInstructions: e.target.value })}
                  className="input-field bg-white"
                  placeholder="Ex: Baixe o arquivo PDF e salve em seu dispositivo para acesso permanente."
                />
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-blue-100 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-surface-700">
                  <input
                    type="checkbox"
                    checked={editingProduct.notifyEmail !== false}
                    onChange={(e) => setEditingProduct({ ...editingProduct, notifyEmail: e.target.checked })}
                    className="w-4 h-4 text-primary-600 rounded"
                  />
                  ✉️ Enviar dados e link de acesso por E-mail
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-surface-700">
                  <input
                    type="checkbox"
                    checked={editingProduct.notifyWhatsapp !== false}
                    onChange={(e) => setEditingProduct({ ...editingProduct, notifyWhatsapp: e.target.checked })}
                    className="w-4 h-4 text-primary-600 rounded"
                  />
                  💬 Enviar dados e link de acesso para o WhatsApp
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="btn-secondary text-sm"
              >
                Cancelar
              </button>
              <button type="submit" className="btn-primary text-sm">
                Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Formulário de Criação de Produto */}
      {showForm && (
        <div className="glass-card p-6 shadow-xl border border-surface-200 animate-slide-up">
          <div className="mb-4 pb-3 border-b border-surface-100">
            <h3 className="font-bold text-surface-800 text-lg">Novo Produto / Infoproduto</h3>
            <p className="text-xs text-surface-500">
              Cadastre o produto e defina o PDF, vídeo, documento ou curso que será disparado automaticamente no pagamento aprovado.
            </p>
          </div>

          <form onSubmit={handleCreateProduct} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-surface-600 mb-1">Nome do Produto</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="Ex: E-book Método Tráfego Lucrativo"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-600 mb-1">Descrição</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  placeholder="Breve resumo sobre o produto"
                />
              </div>
            </div>

            {/* Preços */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-surface-600">Preços & Cobrança</label>
                <button type="button" onClick={addPrice} className="text-xs text-primary-600 hover:text-primary-700 font-semibold">
                  + Adicionar outro preço
                </button>
              </div>
              {formData.prices.map((price, idx) => (
                <div key={idx} className="flex gap-3 mb-2 items-end">
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
                      <option value="ONE_TIME">Pagamento Único</option>
                      <option value="RECURRING">Recorrente (Assinatura)</option>
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

            {/* Módulo de Entrega Digital do Infoproduto */}
            <div className="p-4 bg-gradient-to-br from-emerald-50/70 via-blue-50/40 to-indigo-50/60 rounded-xl border border-emerald-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🚀</span>
                  <div>
                    <h4 className="text-sm font-bold text-surface-800">Entrega Digital do Infoproduto</h4>
                    <p className="text-[11px] text-surface-500">
                      Entregue arquivos, cursos, vídeos ou chaves automaticamente no WhatsApp e E-mail do comprador assim que o pagamento for confirmado.
                    </p>
                  </div>
                </div>
                <span className="hidden sm:inline-block text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
                  100% Automático
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Tipo de Entrega
                  </label>
                  <select
                    value={formData.deliveryType}
                    onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value })}
                    className="input-field bg-white"
                  >
                    <option value="DOWNLOAD">📥 Download de Arquivo / PDF / Documento</option>
                    <option value="ACCESS_LINK">🎓 Curso / Área de Membros / Plataforma</option>
                    <option value="VIDEO">🎬 Vídeo / Aulas Exclusivas (Vimeo, YouTube, Drive)</option>
                    <option value="CUSTOM_TEXT">🔑 Chave de Licença / Senhas / Texto Personalizado</option>
                    <option value="NONE">⚪ Apenas Cobrança (Sem entrega de conteúdo)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">
                    Link do Conteúdo / Arquivo / PDF / Plataforma
                  </label>
                  <input
                    type="url"
                    value={formData.deliveryUrl}
                    onChange={(e) => setFormData({ ...formData, deliveryUrl: e.target.value })}
                    className="input-field bg-white"
                    placeholder="https://drive.google.com/... ou https://seucurso.com/login"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Chaves de Acesso / Senhas / Detalhes de Login (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={formData.deliveryContent}
                  onChange={(e) => setFormData({ ...formData, deliveryContent: e.target.value })}
                  className="input-field bg-white font-mono text-xs"
                  placeholder="Ex: Seu código de ativação: VIP-7788 | Login provisório: seu email cadastrado"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Instruções Adicionais de Acesso (Opcional)
                </label>
                <input
                  type="text"
                  value={formData.deliveryInstructions}
                  onChange={(e) => setFormData({ ...formData, deliveryInstructions: e.target.value })}
                  className="input-field bg-white"
                  placeholder="Ex: Baixe o arquivo PDF e salve em seu dispositivo para acesso permanente."
                />
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-emerald-100 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-surface-700">
                  <input
                    type="checkbox"
                    checked={formData.notifyEmail}
                    onChange={(e) => setFormData({ ...formData, notifyEmail: e.target.checked })}
                    className="w-4 h-4 text-primary-600 rounded"
                  />
                  ✉️ Enviar automaticamente por E-mail
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-surface-700">
                  <input
                    type="checkbox"
                    checked={formData.notifyWhatsapp}
                    onChange={(e) => setFormData({ ...formData, notifyWhatsapp: e.target.checked })}
                    className="w-4 h-4 text-primary-600 rounded"
                  />
                  💬 Enviar automaticamente para o WhatsApp
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button type="submit" className="btn-primary">
                Salvar Produto e Ativar Entrega
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid de Produtos */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => {
          const badge = getDeliveryBadge(product.deliveryType);
          return (
            <div key={product.id} className="glass-card p-6 hover:shadow-card-hover transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center text-xl shadow-sm">
                    📦
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${badge.bg}`}>
                      {badge.label}
                    </span>
                    <span className={`badge ${product.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {product.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>

                <h3 className="font-bold text-surface-800 text-lg mb-1">{product.name}</h3>
                <p className="text-surface-500 text-xs mb-3 line-clamp-2">{product.description || 'Sem descrição'}</p>

                {/* Preços */}
                <div className="space-y-1.5 mb-4">
                  {product.prices.map((price) => (
                    <div key={price.id} className="flex items-center justify-between p-2 bg-surface-50 rounded-lg text-xs">
                      <span className="text-surface-500">
                        {price.type === 'RECURRING'
                          ? `${price.interval === 'month' ? 'Mensal' : 'Anual'}`
                          : 'Único'}
                      </span>
                      <span className="font-bold text-surface-800">{formatCurrency(price.amount)}</span>
                    </div>
                  ))}
                </div>

                {/* Status de Entrega */}
                <div className="p-2.5 bg-surface-50 rounded-lg border border-surface-200/60 mb-4 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-surface-500 font-medium">Link do Conteúdo:</span>
                    {product.deliveryUrl ? (
                      <a
                        href={product.deliveryUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary-600 font-semibold hover:underline truncate max-w-[150px]"
                        title={product.deliveryUrl}
                      >
                        Abrir Link ↗
                      </a>
                    ) : (
                      <span className="text-surface-400">Não configurado</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-surface-500 font-medium">Disparo Automático:</span>
                    <span className="text-surface-700 font-semibold">
                      {product.notifyEmail !== false && '✉️ Email '}{product.notifyWhatsapp !== false && '💬 WhatsApp'}
                      {product.notifyEmail === false && product.notifyWhatsapp === false && 'Desativado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center justify-between text-xs text-surface-400 pt-3 border-t border-surface-100">
                <div className="flex gap-2 text-[11px]">
                  <span>{product._count.payments} vendas</span>
                  <span>•</span>
                  <span>{product._count.paymentLinks} links</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setEditingProduct(product);
                      setShowForm(false);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    ✏️ Editar Entrega
                  </button>
                  <a
                    href="/dashboard/payment-links"
                    className="text-[11px] font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-2.5 py-1 rounded-lg transition-colors"
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
          );
        })}

        {products.length === 0 && (
          <div className="col-span-full text-center py-12 text-surface-400 glass-card">
            <p className="text-5xl mb-3">📦</p>
            <p className="font-semibold text-surface-700 text-lg">Nenhum produto cadastrado</p>
            <p className="text-sm text-surface-400 mt-1 mb-4">
              Clique em "+ Novo Produto" para cadastrar seu primeiro PDF, documento, vídeo ou curso com entrega automática.
            </p>
            <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
              + Cadastrar Meu Primeiro Produto
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
