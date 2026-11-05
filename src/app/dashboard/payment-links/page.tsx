'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface PaymentLink {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  linkType?: 'INTERNAL' | 'EXTERNAL_REDIRECT';
  externalUrl?: string | null;
  redirectClicks?: number;
  bankProvider?: string;
  pixKey?: string | null;
  pixBeneficiary?: string | null;
  active: boolean;
  maxUses: number | null;
  usedCount: number;
  acceptPix: boolean;
  acceptCard: boolean;
  acceptBoleto: boolean;
  product: { id: string; name: string };
  price: { id: string; amount: number; type: string; interval: string | null };
  totalRevenue?: number;
  approvedSales?: number;
  totalClicks?: number;
  _count?: { payments: number };
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  prices: Array<{ id: string; amount: number; type: string; interval: string | null }>;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const getBankLabel = (code?: string) => {
  const map: Record<string, string> = {
    mercadopago: '🛡️ Mercado Pago',
    infinitepay: '⚡ InfinitePay',
    nubank: '🟣 Nubank / NuPay',
    inter: '🟠 Banco Inter',
    itau: '🟦 Banco Itaú',
    bradesco: '🔴 Banco Bradesco',
    santander: '🔴 Banco Santander',
    bb: '🟡 Banco do Brasil',
    caixa: '🔵 Caixa Econômica',
    c6: '⬛ C6 Bank',
    asaas: '⚡ Asaas Pagamentos',
    efi: '🟩 Efí Bank',
    direct_pix: '🟢 PIX Direto',
  };
  return map[code || 'mercadopago'] || `🏦 ${code || 'Mercado Pago'}`;
};

export default function PaymentLinksPage() {
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [copiedId, setCopiedId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filterTab, setFilterTab] = useState<'ALL' | 'INTERNAL' | 'EXTERNAL'>('ALL');

  // Form states
  const [linkType, setLinkType] = useState<'INTERNAL' | 'EXTERNAL_REDIRECT'>('INTERNAL');
  const [pricingMode, setPricingMode] = useState<'custom' | 'product'>('custom');

  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    priceType: 'ONE_TIME', // 'ONE_TIME' | 'RECURRING'
    interval: 'month',     // 'month' | 'year'
    slug: '',
    description: '',
    externalUrl: '',
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

  // Modal de sincronização manual / aprovação de venda
  const [syncModalLink, setSyncModalLink] = useState<PaymentLink | null>(null);
  const [syncName, setSyncName] = useState('');
  const [syncPhone, setSyncPhone] = useState('');
  const [syncEmail, setSyncEmail] = useState('');
  const [syncAmount, setSyncAmount] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [linksRes, productsRes] = await Promise.all([
        fetch('/api/dashboard/payment-links'),
        fetch('/api/dashboard/products'),
      ]);
      const linksData = await linksRes.json();
      const productsData = await productsRes.json();
      setLinks(linksData.links || []);
      setProducts(productsData.products || []);
    } catch (err) {
      console.error('Failed to load payment links:', err);
    } finally {
      setLoading(false);
    }
  }

  const generateSlug = (text: string) =>
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  const handleTitleChange = (val: string) => {
    const generatedSlug = generateSlug(val);
    setFormData((prev) => ({
      ...prev,
      title: val,
      slug: prev.slug === '' || prev.slug === generateSlug(prev.title) ? generatedSlug : prev.slug,
    }));
  };

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const isExternal = linkType === 'EXTERNAL_REDIRECT';

      if (isExternal && (!formData.externalUrl || !formData.externalUrl.startsWith('http'))) {
        throw new Error('Informe a URL válida do link de pagamento do gateway (iniciando com https://)');
      }

      const payload: any = {
        title: formData.title,
        slug: formData.slug || generateSlug(formData.title),
        description: formData.description || null,
        linkType,
        externalUrl: isExternal ? formData.externalUrl.trim() : null,
        maxUses: formData.maxUses ? parseInt(formData.maxUses) : null,
        acceptPix: formData.acceptPix,
        acceptCard: formData.acceptCard,
        acceptBoleto: formData.acceptBoleto,
        bankProvider: formData.bankProvider,
        pixKey: formData.pixKey || null,
        pixBeneficiary: formData.pixBeneficiary || null,
      };

      if (pricingMode === 'custom' || isExternal) {
        if (!formData.amount || parseFloat(formData.amount) <= 0) {
          throw new Error('Informe um valor de faturamento válido maior que zero');
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

      toast.success(
        isExternal
          ? 'Link de pagamento externo configurado e sincronizado!'
          : 'Link de checkout criado com sucesso!'
      );
      setShowForm(false);
      setFormData({
        title: '',
        amount: '',
        priceType: 'ONE_TIME',
        interval: 'month',
        slug: '',
        description: '',
        externalUrl: '',
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
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.aicheckout.com.br';
    const url = `${origin}/pay/${slug}`;
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
    toast.success('Link do aiCheckout copiado com sucesso!');
    setTimeout(() => setCopiedId(''), 2500);
  };

  const copyWebhookUrl = (link: PaymentLink) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.aicheckout.com.br';
    const url = `${origin}/api/webhooks/payment-link/${link.id}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url);
    }
    toast.success('URL de Webhook copiada! Cole no InfinitePay ou no seu gateway.');
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

  // Abrir modal de sincronização manual de pagamento externo
  const handleOpenSync = (link: PaymentLink) => {
    setSyncModalLink(link);
    setSyncAmount((link.price?.amount || 0).toString());
    setSyncName('');
    setSyncPhone('');
    setSyncEmail('');
  };

  const handleConfirmSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syncModalLink) return;
    setSyncing(true);
    try {
      const res = await fetch(`/api/webhooks/external?slug=${syncModalLink.slug}&status=approved`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: syncModalLink.slug,
          status: 'approved',
          amount: parseFloat(syncAmount) || syncModalLink.price?.amount || 0,
          customer: {
            name: syncName || 'Cliente Sincronizado',
            phone: syncPhone || null,
            email: syncEmail || null,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao sincronizar venda');

      toast.success('🎉 Pagamento aprovado, contabilizado no DRE e entrega disparada!');
      setSyncModalLink(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  const filteredLinks = links.filter((link) => {
    if (filterTab === 'INTERNAL') return link.linkType !== 'EXTERNAL_REDIRECT';
    if (filterTab === 'EXTERNAL') return link.linkType === 'EXTERNAL_REDIRECT';
    return true;
  });

  const selectedProduct = products.find((p) => p.id === formData.productId);
  const liveUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/pay/${formData.slug || 'seu-link'}`
      : `https://app.aicheckout.com.br/pay/${formData.slug || 'seu-link'}`;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-surface-900 tracking-tight">Links de Pagamento</h2>
            <span className="badge bg-primary-50 text-primary-700 font-bold border border-primary-200">
              Multi-Gateways & Recorrência
            </span>
          </div>
          <p className="text-surface-500 text-xs mt-1">
            Crie links nativos ou links externos integrados (InfinitePay, Mercado Pago Recorrente, Bancos) com sincronização e DRE automático.
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            if (!showForm) setLinkType('INTERNAL');
          }}
          className={showForm ? 'btn-secondary text-red-600 border-red-200' : 'btn-primary'}
        >
          {showForm ? '✕ Fechar Formulário' : '+ Novo Link de Pagamento'}
        </button>
      </div>

      {/* Creation form */}
      {showForm && (
        <div className="glass-card p-6 sm:p-8 animate-slide-up border-2 border-primary-200 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-surface-100">
            <div>
              <h3 className="font-black text-surface-900 text-xl">Configurar Link de Pagamento</h3>
              <p className="text-surface-400 text-xs">Escolha entre Checkout Direto Nativo ou Redirecionamento Integrado com Gateway Externo</p>
            </div>
          </div>

          {/* Seleção do Tipo Principal de Link */}
          <div className="grid sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => {
                setLinkType('INTERNAL');
                setFormData((prev) => ({ ...prev, bankProvider: 'mercadopago' }));
              }}
              className={`p-5 rounded-2xl border-2 text-left transition-all ${
                linkType === 'INTERNAL'
                  ? 'border-primary-600 bg-primary-50/60 shadow-md ring-2 ring-primary-500/20'
                  : 'border-surface-200 bg-white hover:bg-surface-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">🔒</span>
                {linkType === 'INTERNAL' && (
                  <span className="badge bg-primary-600 text-white font-bold text-[10px]">SELECIONADO</span>
                )}
              </div>
              <h4 className="font-bold text-surface-900 text-base">Checkout Integrado Nativo</h4>
              <p className="text-xs text-surface-500 mt-1 leading-relaxed">
                Tela própria de checkout com PIX (QR Code e Copia e Cola), Cartão e Boleto processados diretamente na sua conta com confirmação em tempo real.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setLinkType('EXTERNAL_REDIRECT');
                setFormData((prev) => ({ ...prev, bankProvider: 'infinitepay' }));
              }}
              className={`p-5 rounded-2xl border-2 text-left transition-all ${
                linkType === 'EXTERNAL_REDIRECT'
                  ? 'border-primary-600 bg-primary-50/60 shadow-md ring-2 ring-primary-500/20'
                  : 'border-surface-200 bg-white hover:bg-surface-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">⚡</span>
                {linkType === 'EXTERNAL_REDIRECT' && (
                  <span className="badge bg-primary-600 text-white font-bold text-[10px]">SELECIONADO</span>
                )}
              </div>
              <h4 className="font-bold text-surface-900 text-base">Link Externo / Recorrente de Bancos</h4>
              <p className="text-xs text-surface-500 mt-1 leading-relaxed">
                Adicione um link já existente da <strong>InfinitePay</strong>, <strong>Mercado Pago Recorrente</strong>, Asaas, etc. O sistema rastreia cliques, sincroniza os pagamentos e contabiliza no DRE!
              </p>
            </button>
          </div>

          <form onSubmit={handleCreate} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-surface-700 mb-1.5">
                Nome do Link / Oferta *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="input-field text-base font-semibold"
                placeholder="Ex: Assinatura Mensal VIP, Consultoria InfinitePay, Produto Digital"
              />
            </div>

            {/* SE FOR LINK EXTERNO: URL EXTERNA & GATEWAY */}
            {linkType === 'EXTERNAL_REDIRECT' && (
              <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50/50 border-2 border-primary-200 rounded-2xl space-y-4 animate-fade-in">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🌐</span>
                  <div>
                    <h4 className="font-bold text-surface-900 text-sm">Dados do Link Externo do Gateway</h4>
                    <p className="text-xs text-surface-500">Cole a URL de pagamento fornecida pelo seu banco ou adquirente</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-surface-700 mb-1">
                      URL do Link de Pagamento / Recorrência *
                    </label>
                    <input
                      type="url"
                      required
                      value={formData.externalUrl}
                      onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })}
                      className="input-field font-mono text-xs bg-white"
                      placeholder="https://link.infinitepay.io/... ou https://www.mercadopago.com.br/subscriptions/checkout?..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-surface-700 mb-1">
                      Banco / Adquirente *
                    </label>
                    <select
                      value={formData.bankProvider}
                      onChange={(e) => setFormData({ ...formData, bankProvider: e.target.value })}
                      className="input-field text-xs font-semibold bg-white"
                    >
                      <option value="infinitepay">⚡ InfinitePay</option>
                      <option value="mercadopago">🛡️ Mercado Pago (Link/Recorrente)</option>
                      <option value="asaas">⚡ Asaas Pagamentos</option>
                      <option value="nubank">🟣 Nubank / NuPay</option>
                      <option value="inter">🟠 Banco Inter</option>
                      <option value="other">🏦 Outro Banco / Gateway</option>
                    </select>
                  </div>
                </div>

                {/* Explicação de Sincronização */}
                <div className="p-3 bg-white/80 rounded-xl border border-primary-200 text-xs text-surface-600 space-y-1">
                  <p className="font-bold text-primary-800">🔄 Como funciona a sincronização automática:</p>
                  <p>
                    1. Ao acessar <strong>/pay/{formData.slug || 'seu-link'}</strong>, o sistema registra a visita e transfere o cliente para o seu gateway.
                  </p>
                  <p>
                    2. Webhook de Confirmação: Cole a URL <code className="bg-primary-100 text-primary-900 px-1 py-0.5 rounded font-mono text-[11px]">{liveUrl.replace('/pay/', '/api/webhooks/external?slug=')}</code> nas configurações do seu gateway para aprovação 100% automática e entrega imediata no WhatsApp!
                  </p>
                </div>
              </div>
            )}

            {/* Pricing Mode Toggle (Se for interno) */}
            {linkType === 'INTERNAL' && (
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
                    💰 Definir Valor Direto no Link
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
                              {formatCurrency(p.amount)} -{' '}
                              {p.type === 'RECURRING'
                                ? `Assinatura ${p.interval === 'year' ? 'Anual' : 'Mensal'}`
                                : 'Pagamento Único (À Vista)'}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SE FOR LINK EXTERNO: VALOR PARA CONTABILIZAÇÃO NO DRE */}
            {linkType === 'EXTERNAL_REDIRECT' && (
              <div className="bg-surface-50 p-4 rounded-xl border border-surface-200">
                <label className="block text-xs font-bold uppercase tracking-wider text-surface-600 mb-2">
                  Valor & Periodicidade da Cobrança Externa
                </label>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-surface-600 mb-1">
                      Valor cobrado no link (R$) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 font-bold text-sm">
                        R$
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.50"
                        required
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="input-field pl-10 text-lg font-bold text-surface-800"
                        placeholder="0,00"
                      />
                    </div>
                    <p className="text-[11px] text-surface-400 mt-1">Usado para contabilização no DRE e faturamento</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-surface-600 mb-1">
                      Modalidade do Link Externo *
                    </label>
                    <select
                      value={`${formData.priceType}-${formData.interval}`}
                      onChange={(e) => {
                        const [type, interval] = e.target.value.split('-');
                        setFormData({ ...formData, priceType: type, interval });
                      }}
                      className="input-field font-medium text-sm"
                    >
                      <option value="ONE_TIME-month">🟢 Pagamento Único (À Vista)</option>
                      <option value="RECURRING-month">🔄 Assinatura Recorrente Mensal</option>
                      <option value="RECURRING-year">🔄 Assinatura Recorrente Anual</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* URL / Slug & Live Preview */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-surface-600">
                URL Personalizada do Link no aiCheckout
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
                  placeholder="ex: assinatura-vip"
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
                  {linkType === 'EXTERNAL_REDIRECT' ? 'Redirecionamento Rastreável' : 'Checkout Seguro'}
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

            {/* Se for checkout interno, exibe configurações bancárias */}
            {linkType === 'INTERNAL' && (
              <>
                <div className="bg-surface-50 p-4 rounded-xl border border-surface-200 space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-surface-700">
                    🏛️ Banco ou Gateway Emissor do Checkout
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
                    <option value="direct_pix">🟢 Chave PIX Direta (Qualquer Banco)</option>
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

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-surface-600 mb-2">
                    Métodos de Pagamento Permitidos
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
              </>
            )}

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
                  '⚡ Salvar & Gerar Link de Pagamento'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quick Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-surface-200 pb-3">
        {[
          { id: 'ALL', label: `Todos os Links (${links.length})` },
          { id: 'INTERNAL', label: `🔒 Checkout Nativo (${links.filter((l) => l.linkType !== 'EXTERNAL_REDIRECT').length})` },
          { id: 'EXTERNAL', label: `⚡ Links Externos (${links.filter((l) => l.linkType === 'EXTERNAL_REDIRECT').length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filterTab === tab.id
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Payment links list */}
      <div className="space-y-4">
        {loading ? (
          <div className="glass-card p-12 text-center">
            <div className="w-8 h-8 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin mx-auto" />
            <p className="text-surface-400 text-sm mt-3">Carregando links...</p>
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="glass-card p-12 text-center text-surface-400">
            <p className="text-5xl mb-3">🔗</p>
            <h3 className="text-lg font-bold text-surface-700 mb-1">Nenhum link encontrado</h3>
            <p className="text-sm max-w-md mx-auto mb-6">
              Crie links de pagamento únicos, assinaturas recorrentes ou integre links da InfinitePay e Mercado Pago.
            </p>
            <button onClick={() => setShowForm(true)} className="btn-primary">
              + Criar Novo Link
            </button>
          </div>
        ) : (
          filteredLinks.map((link) => {
            const isRecurring = link.price?.type === 'RECURRING';
            const isExternal = link.linkType === 'EXTERNAL_REDIRECT';

            return (
              <div key={link.id} className="glass-card p-6 hover:shadow-card-hover transition-all">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="font-bold text-surface-900 text-lg truncate">{link.title}</h3>

                      <span
                        className={`badge ${
                          link.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {link.active ? 'Ativo' : 'Pausado'}
                      </span>

                      {isExternal ? (
                        <span className="badge bg-indigo-100 text-indigo-800 font-bold border border-indigo-200">
                          ⚡ Link Externo ({getBankLabel(link.bankProvider).replace(/^[^\s]+\s/, '')})
                        </span>
                      ) : (
                        <span className="badge bg-blue-100 text-blue-800 font-bold border border-blue-200">
                          🔒 Checkout Nativo
                        </span>
                      )}

                      <span
                        className={`badge ${
                          isRecurring ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {isRecurring ? '🔄 Recorrência' : '🟢 À Vista'}
                      </span>
                    </div>

                    <p className="text-surface-500 text-xs mb-3 line-clamp-1">
                      {link.description || link.product?.name || 'Sem descrição cadastrada'}
                    </p>

                    {/* Linha de métricas financeiras */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-surface-600 bg-surface-50/70 p-2.5 rounded-xl border border-surface-100">
                      <div>
                        <span className="text-[10px] text-surface-400 block uppercase font-bold">Valor</span>
                        <span className="font-black text-surface-900 text-sm">
                          {formatCurrency(link.price?.amount || 0)}
                          {isRecurring && (
                            <span className="font-normal text-[11px] text-surface-500">
                              /{link.price?.interval === 'year' ? 'ano' : 'mês'}
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="h-6 w-px bg-surface-200" />

                      <div>
                        <span className="text-[10px] text-surface-400 block uppercase font-bold">Faturamento</span>
                        <span className="font-bold text-emerald-700 text-sm">
                          {formatCurrency(link.totalRevenue || 0)}
                        </span>
                      </div>

                      <div className="h-6 w-px bg-surface-200" />

                      <div>
                        <span className="text-[10px] text-surface-400 block uppercase font-bold">Vendas Aprovadas</span>
                        <span className="font-bold text-surface-800 text-sm">
                          {link.approvedSales || 0}
                        </span>
                      </div>

                      <div className="h-6 w-px bg-surface-200" />

                      <div>
                        <span className="text-[10px] text-surface-400 block uppercase font-bold">Acessos / Cliques</span>
                        <span className="font-bold text-primary-700 text-sm">
                          {link.totalClicks || 0} cliques
                        </span>
                      </div>

                      <div className="h-6 w-px bg-surface-200" />

                      <div>
                        <span className="text-[10px] text-surface-400 block uppercase font-bold">URL Slug</span>
                        <span className="font-mono text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded text-[11px]">
                          /pay/{link.slug}
                        </span>
                      </div>
                    </div>

                    {isExternal && link.externalUrl && (
                      <p className="text-[11px] text-surface-400 mt-2 font-mono truncate">
                        🔗 Gateway URL: {link.externalUrl}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 lg:self-center">
                    <a
                      href={`/pay/${link.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary py-2 px-3 text-xs font-semibold flex items-center gap-1 shadow-2xs"
                      title="Testar link de pagamento"
                    >
                      ↗ Acessar
                    </a>

                    <button
                      onClick={() => copyLink(link.slug)}
                      className={`py-2 px-3 text-xs rounded-xl font-bold transition-all shadow-2xs ${
                        copiedId === link.slug
                          ? 'bg-emerald-600 text-white'
                          : 'btn-secondary'
                      }`}
                      title="Copiar link para enviar a clientes"
                    >
                      {copiedId === link.slug ? '✓ Copiado' : '📋 Copiar Link'}
                    </button>

                    {isExternal && (
                      <button
                        onClick={() => copyWebhookUrl(link)}
                        className="btn-secondary py-2 px-3 text-xs font-semibold text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                        title="Copiar URL de Webhook para colar no InfinitePay / Gateway"
                      >
                        🔗 Webhook
                      </button>
                    )}

                    {isExternal && (
                      <button
                        onClick={() => handleOpenSync(link)}
                        className="py-2 px-3 text-xs rounded-xl font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-all"
                        title="Confirmar pagamento e disparar entrega manual"
                      >
                        ✓ Sincronizar
                      </button>
                    )}

                    <button
                      onClick={() => toggleActive(link.id, link.active)}
                      className={`py-2 px-3 text-xs rounded-xl font-semibold transition-all ${
                        link.active
                          ? 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                          : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                      }`}
                      title={link.active ? 'Pausar link' : 'Ativar link'}
                    >
                      {link.active ? '⏸ Pausar' : '▶ Ativar'}
                    </button>

                    <button
                      onClick={() => handleDelete(link.id)}
                      className="py-2 px-3 text-xs rounded-xl font-semibold text-rose-600 hover:bg-rose-50 transition-all"
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

      {/* Modal de Sincronização / Baixa Manual */}
      {syncModalLink && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card max-w-md w-full p-6 space-y-4 shadow-2xl border-2 border-emerald-300 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-surface-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <h3 className="font-bold text-surface-900 text-base">Sincronizar Venda Externa</h3>
              </div>
              <button
                onClick={() => setSyncModalLink(null)}
                className="text-surface-400 hover:text-surface-700 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-surface-500">
              Confirmar recebimento do link <strong>{syncModalLink.title}</strong>. A transação será computada no DRE e o infoproduto será disparado no WhatsApp do cliente!
            </p>

            <form onSubmit={handleConfirmSync} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-surface-700 mb-1">
                  Valor Pago (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={syncAmount}
                  onChange={(e) => setSyncAmount(e.target.value)}
                  className="input-field text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Nome do Cliente
                </label>
                <input
                  type="text"
                  value={syncName}
                  onChange={(e) => setSyncName(e.target.value)}
                  className="input-field text-xs"
                  placeholder="Ex: João da Silva"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  WhatsApp do Cliente (para entrega automática)
                </label>
                <input
                  type="text"
                  value={syncPhone}
                  onChange={(e) => setSyncPhone(e.target.value)}
                  className="input-field text-xs"
                  placeholder="Ex: 5511999999999"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  E-mail do Cliente (Opcional)
                </label>
                <input
                  type="email"
                  value={syncEmail}
                  onChange={(e) => setSyncEmail(e.target.value)}
                  className="input-field text-xs"
                  placeholder="cliente@email.com"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSyncModalLink(null)}
                  className="btn-secondary flex-1 py-2.5 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={syncing}
                  className="btn-success flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1 shadow-md"
                >
                  {syncing ? 'Sincronizando...' : '✓ Confirmar & Entregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
