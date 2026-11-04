'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface PaymentLink {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  bankProvider?: string;
  pixKey?: string | null;
  pixBeneficiary?: string | null;
  active: boolean;
  maxUses: number | null;
  usedCount: number;
  acceptPix: boolean;
  acceptCard: boolean;
  acceptBoleto: boolean;
  product: { name: string };
  price: { amount: number; type: string; interval: string | null };
  _count: { payments: number };
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  prices: Array<{ id: string; amount: number; type: string; interval: string | null }>;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const getBankLabel = (code?: string) => {
  const map: Record<string, string> = {
    mercadopago: '🛡️ Mercado Pago',
    nubank: '🟣 Nubank',
    inter: '🟠 Inter',
    itau: '🟦 Itaú',
    bradesco: '🔴 Bradesco',
    santander: '🔴 Santander',
    bb: '🟡 Banco do Brasil',
    caixa: '🔵 Caixa',
    c6: '⬛ C6 Bank',
    asaas: '⚡ Asaas',
    efi: '🟩 Efí Bank',
    direct_pix: '🟢 PIX Universal',
  };
  return map[code || 'mercadopago'] || '🛡️ Mercado Pago';
};

export default function PaymentLinksPage() {
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [copiedId, setCopiedId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form mode: 'custom' (define amount directly) or 'product' (pick existing product)
  const [pricingMode, setPricingMode] = useState<'custom' | 'product'>('custom');

  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    priceType: 'ONE_TIME', // 'ONE_TIME' | 'RECURRING'
    interval: 'month',     // 'month' | 'year'
    slug: '',
    description: '',
    productId: '',
    priceId: '',
    maxUses: '',
    acceptPix: true,
    acceptCard: true,
    acceptBoleto: true,
    bankProvider: 'mercadopago',
    pixKey: '',
    pixBeneficiary: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [linksRes, productsRes] = await Promise.all([
        fetch('/api/dashboard/payment-links'),
        fetch('/api/dashboard/products'),
      ]);
      const linksData = await linksRes.json();
      const productsData = await productsRes.json();
      setLinks(linksData.links || []);
      setProducts(productsData.products || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  // Auto-generate slug when title changes
  const handleTitleChange = (val: string) => {
    const generatedSlug = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    setFormData((prev) => ({
      ...prev,
      title: val,
      slug: prev.slug === '' || prev.slug === generateSlug(prev.title) ? generatedSlug : prev.slug,
    }));
  };

  const generateSlug = (text: string) =>
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload: any = {
        title: formData.title,
        slug: formData.slug || generateSlug(formData.title),
        description: formData.description || null,
        maxUses: formData.maxUses ? parseInt(formData.maxUses) : null,
        acceptPix: formData.acceptPix,
        acceptCard: formData.acceptCard,
        acceptBoleto: formData.acceptBoleto,
        bankProvider: formData.bankProvider,
        pixKey: formData.pixKey || null,
        pixBeneficiary: formData.pixBeneficiary || null,
      };

      if (pricingMode === 'custom') {
        if (!formData.amount || parseFloat(formData.amount) <= 0) {
          throw new Error('Informe um valor válido maior que zero');
        }
        payload.amount = parseFloat(formData.amount);
        payload.priceType = formData.priceType;
        payload.interval = formData.interval;
        if (formData.productId) payload.productId = formData.productId;
      } else {
        if (!formData.productId || !formData.priceId) {
          throw new Error('Selecione o produto e o preço correspondente');
        }
        payload.productId = formData.productId;
        payload.priceId = formData.priceId;
      }

      const res = await fetch('/api/dashboard/payment-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar link');

      toast.success('Link de pagamento criado com sucesso!');
      setShowForm(false);
      setFormData({
        title: '',
        amount: '',
        priceType: 'ONE_TIME',
        interval: 'month',
        slug: '',
        description: '',
        productId: '',
        priceId: '',
        maxUses: '',
        acceptPix: true,
        acceptCard: true,
        acceptBoleto: true,
        bankProvider: 'mercadopago',
        pixKey: '',
        pixBeneficiary: '',
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/pay/${slug}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedId(slug);
    toast.success('Link copiado para a área de transferência!');
    setTimeout(() => setCopiedId(''), 2500);
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/dashboard/payment-links/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive }),
      });
      if (!res.ok) throw new Error();
      toast.success(currentActive ? 'Link pausado' : 'Link ativado');
      fetchData();
    } catch {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este link de pagamento?')) return;
    try {
      const res = await fetch(`/api/dashboard/payment-links/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Link excluído com sucesso');
      fetchData();
    } catch {
      toast.error('Erro ao excluir link');
    }
  };

  const selectedProduct = products.find((p) => p.id === formData.productId);
  const liveUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/pay/${formData.slug || 'seu-link'}`
    : `http://localhost:3000/pay/${formData.slug || 'seu-link'}`;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-surface-800">Links de Pagamento</h2>
          <p className="text-surface-500 text-sm mt-0.5">
            Gere links de pagamento profissionais para enviar via WhatsApp, redes sociais ou clientes
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={showForm ? 'btn-secondary text-red-600 border-red-200' : 'btn-primary'}
        >
          {showForm ? '✕ Fechar Formulário' : '+ Novo Link de Pagamento'}
        </button>
      </div>

      {/* Creation form */}
      {showForm && (
        <div className="glass-card p-8 animate-slide-up border-2 border-primary-100 shadow-md">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-surface-100">
            <div>
              <h3 className="font-bold text-surface-800 text-lg">Criar Link de Pagamento</h3>
              <p className="text-surface-400 text-xs">Configure o valor, título e formas de recebimento aceitas</p>
            </div>
            <span className="text-xs bg-primary-50 text-primary-700 font-semibold px-3 py-1.5 rounded-full">
              Checkout Seguro Mercado Pago
            </span>
          </div>

          <form onSubmit={handleCreate} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-surface-600 mb-1.5">
                Título do Link / Produto *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="input-field text-base font-medium"
                placeholder="Ex: Consultoria Individual VIP, Acesso Mensal Pro, Curso Completo"
              />
            </div>

            {/* Pricing Mode Toggle */}
            <div className="bg-surface-50 p-4 rounded-xl border border-surface-200">
              <label className="block text-xs font-bold uppercase tracking-wider text-surface-600 mb-2">
                Definição de Valor e Modalidade
              </label>
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setPricingMode('custom')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    pricingMode === 'custom'
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-white text-surface-600 border border-surface-200 hover:bg-surface-100'
                  }`}
                >
                  💰 Definir Valor Direto no Link (Mais Rápido)
                </button>
                <button
                  type="button"
                  onClick={() => setPricingMode('product')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    pricingMode === 'product'
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-white text-surface-600 border border-surface-200 hover:bg-surface-100'
                  }`}
                >
                  📦 Selecionar Produto Existente
                </button>
              </div>

              {/* Custom amount mode */}
              {pricingMode === 'custom' && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-surface-600 mb-1">
                      Valor a cobrar (R$) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 font-bold text-sm">
                        R$
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.50"
                        required={pricingMode === 'custom'}
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="input-field pl-10 text-lg font-bold text-surface-800"
                        placeholder="0,00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-surface-600 mb-1">
                      Tipo de Cobrança *
                    </label>
                    <select
                      value={`${formData.priceType}-${formData.interval}`}
                      onChange={(e) => {
                        const [type, interval] = e.target.value.split('-');
                        setFormData({ ...formData, priceType: type, interval });
                      }}
                      className="input-field font-medium text-sm"
                    >
                      <option value="ONE_TIME-month">🟢 Pagamento Único / À Vista (Sem recorrência)</option>
                      <option value="RECURRING-month">🔄 Assinatura Mensal (Cobrança todo mês)</option>
                      <option value="RECURRING-year">🔄 Assinatura Anual (Cobrança anual)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Product link mode */}
              {pricingMode === 'product' && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-surface-600 mb-1">
                      Selecione o Produto *
                    </label>
                    <select
                      value={formData.productId}
                      onChange={(e) => {
                        const prodId = e.target.value;
                        const prod = products.find((p) => p.id === prodId);
                        setFormData({
                          ...formData,
                          productId: prodId,
                          priceId: prod?.prices[0]?.id || '',
                        });
                      }}
                      className="input-field text-sm"
                    >
                      <option value="">Escolha um produto cadastrado...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.prices.length} preço(s))
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-surface-600 mb-1">
                      Preço do Produto *
                    </label>
                    <select
                      value={formData.priceId}
                      onChange={(e) => setFormData({ ...formData, priceId: e.target.value })}
                      className="input-field text-sm"
                      disabled={!formData.productId}
                    >
                      {!selectedProduct ? (
                        <option value="">Selecione um produto primeiro</option>
                      ) : selectedProduct.prices.length === 0 ? (
                        <option value="">Nenhum preço cadastrado neste produto</option>
                      ) : (
                        selectedProduct.prices.map((p) => (
                          <option key={p.id} value={p.id}>
                            {formatCurrency(p.amount)} - {p.type === 'RECURRING' ? `Assinatura ${p.interval === 'year' ? 'Anual' : 'Mensal'}` : 'Pagamento Único (À Vista)'}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* URL / Slug & Live Preview */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-surface-600">
                URL Personalizada do Link de Pagamento
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-surface-400 bg-surface-100 px-3 py-3 rounded-xl border border-surface-200">
                  /pay/
                </span>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                    })
                  }
                  className="input-field flex-1 font-mono text-sm"
                  placeholder="ex: consultoria-vip"
                />
              </div>

              {/* Live Preview Box */}
              <div className="p-3 bg-primary-50/60 border border-primary-200/80 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-primary-600 text-sm">🔗</span>
                  <span className="text-xs text-primary-800 font-mono truncate">
                    {liveUrl}
                  </span>
                </div>
                <span className="text-xs font-bold text-primary-700 bg-white px-2 py-1 rounded-md shadow-2xs">
                  Prévia em tempo real
                </span>
              </div>
            </div>

            {/* Description & Max uses */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-surface-600 mb-1">
                  Descrição ou Instruções (Opcional)
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field text-sm"
                  placeholder="Ex: Acesso liberado imediatamente após a confirmação"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-600 mb-1">
                  Limite de Usos (Opcional)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                  className="input-field text-sm"
                  placeholder="Deixe em branco para ilimitado"
                />
              </div>
            </div>

            {/* Bank Provider Selection */}
            <div className="bg-surface-50 p-4 rounded-xl border border-surface-200 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-surface-700">
                🏛️ Banco ou Gateway Emissor do Link
              </label>
              <select
                value={formData.bankProvider}
                onChange={(e) => setFormData({ ...formData, bankProvider: e.target.value })}
                className="input-field text-sm font-semibold"
              >
                <option value="mercadopago">🛡️ Mercado Pago (API Oficial com Confirmação Instantânea)</option>
                <option value="nubank">🟣 Nubank (Nu Pagamentos)</option>
                <option value="inter">🟠 Banco Inter</option>
                <option value="itau">🟦 Banco Itaú</option>
                <option value="bradesco">🔴 Banco Bradesco</option>
                <option value="santander">🔴 Banco Santander</option>
                <option value="bb">🟡 Banco do Brasil</option>
                <option value="caixa">🔵 Caixa Econômica Federal</option>
                <option value="c6">⬛ C6 Bank</option>
                <option value="asaas">⚡ Asaas Pagamentos</option>
                <option value="efi">🟩 Efí Bank (Gerencianet)</option>
                <option value="direct_pix">🟢 Chave PIX Direta (Qualquer Banco do Brasil)</option>
              </select>

              {formData.bankProvider !== 'mercadopago' && (
                <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-surface-200 animate-fade-in">
                  <div>
                    <label className="block text-xs font-semibold text-surface-600 mb-1">
                      Chave PIX da sua conta (Opcional)
                    </label>
                    <input
                      type="text"
                      value={formData.pixKey}
                      onChange={(e) => setFormData({ ...formData, pixKey: e.target.value })}
                      className="input-field text-xs"
                      placeholder="CPF, CNPJ, Celular, E-mail ou Aleatória"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-surface-600 mb-1">
                      Nome do Titular / Beneficiário
                    </label>
                    <input
                      type="text"
                      value={formData.pixBeneficiary}
                      onChange={(e) => setFormData({ ...formData, pixBeneficiary: e.target.value })}
                      className="input-field text-xs"
                      placeholder="Nome impresso no comprovante"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Methods accepted */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-surface-600 mb-2">
                Métodos de Pagamento Permitidos Neste Link
              </label>
              <div className="flex flex-wrap gap-4 p-4 bg-surface-50 rounded-xl border border-surface-100">
                {[
                  { key: 'acceptPix', label: '🟢 PIX Instantâneo' },
                  { key: 'acceptCard', label: '💳 Cartão de Crédito/Débito' },
                  { key: 'acceptBoleto', label: '📄 Boleto Bancário' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer font-medium text-sm text-surface-700">
                    <input
                      type="checkbox"
                      checked={(formData as any)[key]}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })}
                      className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full py-3.5 text-base font-bold shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Gerando Link de Pagamento...
                  </>
                ) : (
                  '⚡ Gerar Link de Pagamento Agora'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payment links list */}
      <div className="space-y-4">
        {loading ? (
          <div className="glass-card p-12 text-center">
            <div className="w-8 h-8 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin mx-auto" />
            <p className="text-surface-400 text-sm mt-3">Carregando links...</p>
          </div>
        ) : links.length === 0 ? (
          <div className="glass-card p-12 text-center text-surface-400">
            <p className="text-5xl mb-3">🔗</p>
            <h3 className="text-lg font-bold text-surface-700 mb-1">Nenhum link criado ainda</h3>
            <p className="text-sm max-w-md mx-auto mb-6">
              Crie seu primeiro link de pagamento com valor único ou recorrente para começar a vender.
            </p>
            <button onClick={() => setShowForm(true)} className="btn-primary">
              + Criar Meu Primeiro Link
            </button>
          </div>
        ) : (
          links.map((link) => {
            const isRecurring = link.price?.type === 'RECURRING';
            return (
              <div key={link.id} className="glass-card p-6 hover:shadow-card-hover transition-all">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-surface-800 text-lg truncate">{link.title}</h3>
                      <span className={`badge ${link.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {link.active ? 'Ativo' : 'Pausado'}
                      </span>
                      <span className={`badge ${isRecurring ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {isRecurring ? '🔄 Recorrente' : '🟢 À Vista'}
                      </span>
                      <span className="badge bg-surface-100 text-surface-700 border border-surface-200">
                        {getBankLabel(link.bankProvider)}
                      </span>
                    </div>

                    <p className="text-surface-500 text-sm mb-3">
                      {link.description || link.product?.name || 'Sem descrição'}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-surface-500">
                      <span className="font-extrabold text-surface-800 text-sm">
                        {formatCurrency(link.price?.amount || 0)}
                        {isRecurring && <span className="font-normal text-xs text-surface-400">/{link.price?.interval === 'year' ? 'ano' : 'mês'}</span>}
                      </span>
                      <span>•</span>
                      <span className="font-mono text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
                        /pay/{link.slug}
                      </span>
                      <span>•</span>
                      <span>{link._count?.payments || 0} venda(s)</span>
                      <span>•</span>
                      <span>{link.usedCount}{link.maxUses ? `/${link.maxUses}` : ''} uso(s)</span>
                      <span>•</span>
                      <span className="flex gap-1 items-center">
                        {link.acceptPix && <span title="Aceita PIX">🟢 PIX</span>}
                        {link.acceptCard && <span title="Aceita Cartão">💳 Cartão</span>}
                        {link.acceptBoleto && <span title="Aceita Boleto">📄 Boleto</span>}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 md:self-center">
                    <a
                      href={`/pay/${link.slug}`}
                      target="_blank"
                      className="btn-secondary py-2 px-3 text-xs font-semibold flex items-center gap-1"
                      title="Abrir página de checkout"
                    >
                      ↗ Abrir Checkout
                    </a>
                    <button
                      onClick={() => copyLink(link.slug)}
                      className={`py-2 px-3 text-xs rounded-xl font-bold transition-all ${
                        copiedId === link.slug
                          ? 'bg-accent-500 text-white shadow-sm'
                          : 'btn-secondary'
                      }`}
                      title="Copiar link para enviar"
                    >
                      {copiedId === link.slug ? '✓ Link Copiado' : '📋 Copiar Link'}
                    </button>
                    <button
                      onClick={() => toggleActive(link.id, link.active)}
                      className={`py-2 px-3 text-xs rounded-xl font-semibold transition-all ${
                        link.active
                          ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                          : 'bg-green-50 text-green-700 hover:bg-green-100'
                      }`}
                      title={link.active ? 'Pausar link' : 'Ativar link'}
                    >
                      {link.active ? '⏸ Pausar' : '▶ Ativar'}
                    </button>
                    <button
                      onClick={() => handleDelete(link.id)}
                      className="py-2 px-3 text-xs rounded-xl font-semibold text-red-600 hover:bg-red-50 transition-all"
                      title="Excluir link"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
