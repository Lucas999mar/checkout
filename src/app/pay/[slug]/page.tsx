'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';

interface PriceOption {
  id: string;
  amount: number;
  type: string; // 'ONE_TIME' | 'RECURRING'
  interval: string | null;
  intervalCount: number | null;
}

interface PaymentLinkData {
  id: string;
  slug: string;
  title: string;
  description: string;
  bankProvider?: string;
  pixKey?: string | null;
  pixBeneficiary?: string | null;
  product: {
    id: string;
    name: string;
    description: string;
    imageUrl: string | null;
    prices: PriceOption[];
  };
  price: PriceOption;
  acceptPix: boolean;
  acceptCard: boolean;
  acceptBoleto: boolean;
}

type PaymentMethod = 'pix' | 'card' | 'boleto';

export default function CheckoutPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [linkData, setLinkData] = useState<PaymentLinkData | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<PriceOption | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
    phone: '',
  });
  const [processing, setProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  const [deliveryInfo, setDeliveryInfo] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    async function fetchLink() {
      try {
        const res = await fetch(`/api/checkout/${slug}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setLinkData(data.link);
        setSelectedPrice(data.link.price);

        if (data.link.acceptPix) setPaymentMethod('pix');
        else if (data.link.acceptCard) setPaymentMethod('card');
        else setPaymentMethod('boleto');
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchLink();
  }, [slug]);

  // Check payment status manually or via polling
  const checkPaymentStatus = useCallback(async (paymentId: string) => {
    try {
      setIsVerifying(true);
      const res = await fetch(`/api/payments/status/${paymentId}`);
      const data = await res.json();
      if (data.payment?.status === 'APPROVED') {
        setPaymentStatus('APPROVED');
        if (data.delivery) {
          setDeliveryInfo(data.delivery);
        }
        toast.success('🎉 Pagamento aprovado com sucesso!');
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  // Poll payment status for PIX
  const pollStatus = useCallback((paymentId: string) => {
    const interval = setInterval(async () => {
      const approved = await checkPaymentStatus(paymentId);
      if (approved) {
        clearInterval(interval);
      }
    }, 3000);

    // Stop polling after 15 minutes
    setTimeout(() => clearInterval(interval), 15 * 60 * 1000);
  }, [checkPaymentStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkData || !selectedPrice) return;
    setProcessing(true);

    try {
      const isRecurring = selectedPrice.type === 'RECURRING';

      // RECURRING SUBSCRIPTION FLOW
      if (isRecurring && paymentMethod === 'card') {
        const res = await fetch('/api/payments/create-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reason: `${linkData.title} (${selectedPrice.interval === 'year' ? 'Anual' : 'Mensal'})`,
            amount: selectedPrice.amount,
            payerEmail: formData.email,
            frequency: selectedPrice.intervalCount || 1,
            frequencyType: selectedPrice.interval === 'year' ? 'years' : 'months',
            priceId: selectedPrice.id,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        // Redirect to Mercado Pago subscription setup
        window.location.href = data.initPoint;
        return;
      }

      // ONE-TIME OR RECURRING WITH PIX
      if (paymentMethod === 'pix') {
        const res = await fetch('/api/payments/create-pix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: selectedPrice.amount,
            description: `${linkData.title} - ${isRecurring ? 'Primeira Mensalidade' : 'Pagamento Único'}`,
            payerEmail: formData.email,
            payerFirstName: formData.name.split(' ')[0] || 'Cliente',
            payerLastName: formData.name.split(' ').slice(1).join(' ') || '',
            payerCpf: formData.cpf.replace(/\D/g, ''),
            productId: linkData.product.id,
            paymentLinkId: linkData.id,
            selectedBank: linkData.bankProvider || 'mercadopago',
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setPaymentResult(data);
        setPaymentStatus('PENDING');
        pollStatus(data.paymentId);
      } else if (paymentMethod === 'card') {
        // ONE-TIME CARD PAYMENT (Checkout Pro / Transparente)
        const res = await fetch('/api/payments/create-preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `${linkData.title} (Pagamento À Vista)`,
            description: linkData.product.description || linkData.title,
            amount: selectedPrice.amount,
            payerEmail: formData.email,
            paymentLinkId: linkData.id,
            excludedPaymentMethods: ['pix', 'bolbradesco', 'pec'],
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        window.location.href = data.initPoint || data.sandboxInitPoint;
      } else if (paymentMethod === 'boleto') {
        // BOLETO PAYMENT
        const res = await fetch('/api/payments/create-preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `${linkData.title} (Boleto Bancário)`,
            description: linkData.product.description || linkData.title,
            amount: selectedPrice.amount,
            payerEmail: formData.email,
            paymentLinkId: linkData.id,
            excludedPaymentMethods: ['pix', 'visa', 'master', 'amex', 'elo', 'hipercard'],
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        window.location.href = data.initPoint || data.sandboxInitPoint;
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar pagamento');
    } finally {
      setProcessing(false);
    }
  };

  const handleCopyPix = () => {
    if (paymentResult?.qrCode) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(paymentResult.qrCode);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = paymentResult.qrCode;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      toast.success('Código PIX copiado com sucesso!');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .slice(0, 14);
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  if (loading) {
    return (
      <main className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin" />
          <p className="text-surface-500 font-medium">Carregando checkout seguro...</p>
        </div>
      </main>
    );
  }

  if (error || !linkData || !selectedPrice) {
    return (
      <main className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
        <div className="glass-card p-12 text-center max-w-md">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-surface-800 mb-2">Link não disponível</h2>
          <p className="text-surface-500 mb-6">{error || 'Este link de pagamento não foi encontrado.'}</p>
          <a href="/" className="btn-secondary inline-block">Voltar ao Início</a>
        </div>
      </main>
    );
  }

  // Payment approved state
  if (paymentStatus === 'APPROVED') {
    const isDownload = deliveryInfo?.deliveryType === 'DOWNLOAD';
    const isVideo = deliveryInfo?.deliveryType === 'VIDEO';
    const isCourse = deliveryInfo?.deliveryType === 'ACCESS_LINK';

    let actionLabel = '📥 Baixar Meu Arquivo / PDF Agora';
    if (isVideo) actionLabel = '🎬 Assistir Vídeo / Acessar Aulas';
    else if (isCourse) actionLabel = '🎓 Acessar Área de Membros / Curso';
    else if (deliveryInfo?.deliveryType === 'CUSTOM_TEXT') actionLabel = '🔑 Visualizar Conteúdo';

    return (
      <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-surface-50 to-blue-50 flex items-center justify-center p-4">
        <div className="glass-card p-8 sm:p-10 text-center max-w-lg w-full animate-slide-up shadow-2xl border-2 border-emerald-200">
          <div className="w-20 h-20 rounded-full bg-emerald-100 border-4 border-emerald-200 flex items-center justify-center mx-auto mb-5 shadow-sm">
            <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <span className="inline-block bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2">
            Acesso Liberado Imediatamente
          </span>
          <h2 className="text-3xl font-extrabold text-surface-900 mb-2">Pagamento Confirmado! 🎉</h2>
          <p className="text-surface-600 text-sm mb-6">
            Seu pagamento de <strong>{formatCurrency(selectedPrice.amount)}</strong> referente a <strong>{linkData.title}</strong> foi aprovado com sucesso.
          </p>

          {/* Módulo de Acesso / Download Imediato */}
          <div className="p-5 bg-white rounded-2xl border border-surface-200 shadow-sm text-left mb-6 space-y-4">
            <div className="flex items-center justify-between border-b border-surface-100 pb-2">
              <span className="text-xs font-bold text-surface-500 uppercase tracking-wider">
                📦 Seu Conteúdo Digital
              </span>
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Disponível
              </span>
            </div>

            {deliveryInfo?.deliveryUrl ? (
              <div className="text-center pt-1">
                <a
                  href={deliveryInfo.deliveryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-base text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                >
                  {actionLabel}
                </a>
                <p className="text-[11px] text-surface-400 mt-2 break-all">
                  Link direto: <a href={deliveryInfo.deliveryUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{deliveryInfo.deliveryUrl}</a>
                </p>
              </div>
            ) : null}

            {deliveryInfo?.deliveryContent && (
              <div className="bg-surface-50 p-3.5 rounded-xl border border-surface-200">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-surface-700">🔑 Dados de Acesso / Chave:</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(deliveryInfo.deliveryContent);
                      }
                      toast.success('Chave copiada!');
                    }}
                    className="text-[11px] font-semibold text-primary-600 hover:underline"
                  >
                    Copiar
                  </button>
                </div>
                <pre className="text-xs font-mono bg-white p-2.5 rounded-lg border border-surface-200 text-surface-800 whitespace-pre-wrap break-all">
                  {deliveryInfo.deliveryContent}
                </pre>
              </div>
            )}

            {deliveryInfo?.deliveryInstructions && (
              <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-100 text-xs text-blue-900">
                <span className="font-bold block mb-0.5">ℹ️ Orientações:</span>
                {deliveryInfo.deliveryInstructions}
              </div>
            )}

            {/* Botão de WhatsApp */}
            {deliveryInfo?.whatsappDirectLink && (
              <div className="pt-2">
                <a
                  href={deliveryInfo.whatsappDirectLink}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-green-500 hover:bg-green-600 transition-colors shadow-sm"
                >
                  <span>💬</span> Receber no meu WhatsApp
                </a>
              </div>
            )}

            {/* Aviso de Envio de E-mail */}
            <div className="text-[12px] text-surface-500 flex items-center gap-2 pt-1 border-t border-surface-100">
              <span>✉️</span>
              <span>
                Também enviamos uma cópia completa deste acesso para <strong>{formData.email}</strong>.
              </span>
            </div>
          </div>

          <div className="p-3 bg-surface-100/70 rounded-xl text-left mb-6 text-xs text-surface-600 space-y-1">
            <p><strong>Comprovante:</strong> #{paymentResult?.mpPaymentId || paymentResult?.paymentId}</p>
            <p><strong>Cliente:</strong> {formData.name}</p>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="btn-secondary w-full text-sm"
          >
            Fazer Novo Pedido
          </button>
        </div>
      </main>
    );
  }

  // PIX QR Code & Copia e Cola View
  if (paymentResult && paymentMethod === 'pix') {
    const bankName = paymentResult.bankName || 'Mercado Pago / PIX Universal';
    const bankIcon = paymentResult.bankIcon || '🟢';

    return (
      <main className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
        <div className="glass-card p-8 max-w-lg w-full animate-slide-up">
          {/* Bank Brand Banner */}
          <div className="flex items-center justify-between p-3.5 rounded-xl mb-6 bg-surface-100 border border-surface-200">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{bankIcon}</span>
              <div>
                <p className="text-[11px] text-surface-500 font-semibold uppercase tracking-wider">Conta de Destino</p>
                <p className="text-sm font-bold text-surface-800">{bankName}</p>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Aguardando PIX
            </div>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-surface-800">Pague com PIX</h2>
            <p className="text-surface-500 text-sm mt-1">{linkData.product.name}</p>
            <p className="text-3xl font-extrabold text-surface-800 mt-2">{formatCurrency(selectedPrice.amount)}</p>
          </div>

          {/* QR Code image */}
          {paymentResult.qrCodeBase64 && (
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-white border-2 border-surface-200 rounded-2xl shadow-sm relative group">
                <img
                  src={`data:image/png;base64,${paymentResult.qrCodeBase64}`}
                  alt="QR Code PIX"
                  className="w-56 h-56 mx-auto"
                />
                <div className="text-center mt-2 text-[11px] text-surface-400 font-medium">
                  Escaneie com a câmera ou app do banco
                </div>
              </div>
            </div>
          )}

          {/* Copia e Cola */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-surface-600 mb-1.5">
              Código Copia e Cola (Padrão BACEN - 100% dos Bancos)
            </label>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={paymentResult.qrCode || ''}
                className="input-field pr-24 text-xs font-mono bg-surface-50"
              />
              <button
                type="button"
                onClick={handleCopyPix}
                className={`absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  copied
                    ? 'bg-accent-500 text-white shadow-sm'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {copied ? '✓ Copiado' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Atalhos Rápidos para Apps Bancários no Celular */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-surface-600 mb-2">Abra o app do seu banco para pagar:</p>
            <div className="grid grid-cols-4 gap-2 text-center">
              <a
                href="nubank://"
                className="p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors block"
                title="Abrir App Nubank"
              >
                <span className="text-xl block">🟣</span>
                <span className="text-[11px] font-bold text-purple-900 block truncate">Nubank</span>
              </a>
              <a
                href="bancointer://"
                className="p-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-colors block"
                title="Abrir App Banco Inter"
              >
                <span className="text-xl block">🟠</span>
                <span className="text-[11px] font-bold text-orange-900 block truncate">Inter</span>
              </a>
              <a
                href="itau://"
                className="p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors block"
                title="Abrir App Itaú"
              >
                <span className="text-xl block">🟦</span>
                <span className="text-[11px] font-bold text-amber-900 block truncate">Itaú</span>
              </a>
              <a
                href="mercadopago://"
                className="p-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors block"
                title="Abrir App Mercado Pago"
              >
                <span className="text-xl block">🛡️</span>
                <span className="text-[11px] font-bold text-sky-900 block truncate">MP</span>
              </a>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => checkPaymentStatus(paymentResult.paymentId)}
              disabled={isVerifying}
              className="btn-success w-full flex items-center justify-center gap-2 text-sm py-3 font-bold"
            >
              {isVerifying ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Consultando Banco...
                </>
              ) : (
                '🔄 Já Paguei / Confirmar Pagamento Agora'
              )}
            </button>

            <button
              type="button"
              onClick={() => setPaymentResult(null)}
              className="btn-secondary w-full text-sm py-2.5"
            >
              ← Trocar Forma de Pagamento
            </button>
          </div>

          {/* Step by step */}
          <div className="mt-6 p-4 bg-surface-50 rounded-xl border border-surface-100">
            <h4 className="font-semibold text-surface-700 text-xs mb-2">Como pagar com qualquer banco:</h4>
            <ol className="text-xs text-surface-500 space-y-1.5">
              <li>1. Abra o app de qualquer banco brasileiro (Nubank, Itaú, Bradesco, Inter, Santander, BB, Caixa, C6, etc.)</li>
              <li>2. Escolha <strong>Área PIX</strong> &gt; <strong>Ler QR Code</strong> ou <strong>PIX Copia e Cola</strong></li>
              <li>3. Cole o código copiado ou aponte a câmera para o QR Code acima</li>
              <li>4. Confirme o pagamento — a aprovação é instantânea no sistema!</li>
            </ol>
          </div>
        </div>
      </main>
    );
  }

  const isRecurring = selectedPrice.type === 'RECURRING';
  const availablePrices = linkData.product.prices && linkData.product.prices.length > 0
    ? linkData.product.prices
    : [linkData.price];

  return (
    <main className="min-h-screen bg-surface-50 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Product Summary Sidebar */}
          <div className="lg:col-span-2">
            <div className="glass-card p-6 sticky top-8">
              <div className="w-full h-40 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 mb-6 flex items-center justify-center text-white shadow-md">
                <span className="text-5xl">🛍️</span>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className={`badge ${isRecurring ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                  {isRecurring ? '🔄 Plano Recorrente' : '🟢 Pagamento Único / À Vista'}
                </span>
              </div>

              <h2 className="text-2xl font-bold text-surface-800 mb-2">
                {linkData.product.name}
              </h2>
              <p className="text-surface-500 text-sm mb-6 leading-relaxed">
                {linkData.product.description || linkData.description}
              </p>

              {/* Multiple pricing options selector (if product has both one-time and recurring) */}
              {availablePrices.length > 1 && (
                <div className="mb-6">
                  <label className="block text-xs font-semibold text-surface-600 mb-2">
                    Escolha a modalidade de pagamento:
                  </label>
                  <div className="space-y-2">
                    {availablePrices.map((p) => {
                      const isSelected = selectedPrice.id === p.id;
                      const isPRecurring = p.type === 'RECURRING';
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedPrice(p)}
                          className={`w-full p-3 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                            isSelected
                              ? 'border-primary-600 bg-primary-50/50 shadow-sm'
                              : 'border-surface-200 bg-white hover:border-surface-300'
                          }`}
                        >
                          <div>
                            <p className="font-semibold text-surface-800 text-sm">
                              {isPRecurring
                                ? `Assinatura ${p.interval === 'year' ? 'Anual' : 'Mensal'}`
                                : 'Pagamento Único (À Vista)'}
                            </p>
                            <p className="text-xs text-surface-400">
                              {isPRecurring ? 'Cobrança periódica' : 'Sem mensalidades'}
                            </p>
                          </div>
                          <span className="font-bold text-surface-800 text-sm">
                            {formatCurrency(p.amount)}
                            {isPRecurring && <span className="text-xs text-surface-400">/{p.interval === 'year' ? 'ano' : 'mês'}</span>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Price summary */}
              <div className="border-t border-surface-100 pt-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-surface-500 text-sm">
                    {isRecurring ? 'Valor por período:' : 'Total à vista:'}
                  </span>
                  <div className="text-right">
                    <span className="text-3xl font-extrabold text-surface-800">
                      {formatCurrency(selectedPrice.amount)}
                    </span>
                    {isRecurring && (
                      <span className="text-surface-400 text-xs block">
                        cobrado {selectedPrice.interval === 'year' ? 'anualmente' : 'mensalmente'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="mt-6 pt-6 border-t border-surface-100 space-y-2">
                <div className="flex items-center gap-2 text-xs text-surface-600 font-medium">
                  <span className="text-accent-500">✓</span> Confirmação instantânea em todos os bancos
                </div>
                <div className="flex items-center gap-2 text-xs text-surface-500">
                  <span className="text-primary-500">🔒</span> Checkout seguro com criptografia SSL 256 bits
                </div>
                <div className="flex items-center gap-2 text-xs text-surface-500">
                  <span>🏦</span> Nubank, Inter, Itaú, Bradesco, BB, Santander, Caixa, C6
                </div>
              </div>
            </div>
          </div>

          {/* Checkout Form */}
          <div className="lg:col-span-3">
            <div className="glass-card p-8">
              <h3 className="text-xl font-bold text-surface-800 mb-6">
                Dados e Forma de Pagamento
              </h3>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-surface-700 text-sm flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs flex items-center justify-center font-bold">1</span>
                    Seus dados de identificação
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-surface-600 mb-1.5">Nome completo *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="input-field text-sm"
                        placeholder="Ex: Carlos Eduardo Silva"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-surface-600 mb-1.5">Email *</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="input-field text-sm"
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-surface-600 mb-1.5">CPF (obrigatório para PIX/Nota) *</label>
                      <input
                        type="text"
                        required
                        value={formData.cpf}
                        onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                        className="input-field text-sm"
                        placeholder="000.000.000-00"
                        maxLength={14}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-surface-600 mb-1.5">Telefone / WhatsApp</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="input-field text-sm"
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-surface-700 text-sm flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs flex items-center justify-center font-bold">2</span>
                    Escolha a forma de pagamento
                  </h4>

                  <div className="grid sm:grid-cols-3 gap-3">
                    {/* PIX */}
                    {linkData.acceptPix && (
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('pix')}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                          paymentMethod === 'pix'
                            ? 'border-accent-500 bg-accent-50/50 shadow-sm'
                            : 'border-surface-200 hover:border-surface-300 bg-white'
                        }`}
                      >
                        <span className="text-2xl block mb-1">🟢</span>
                        <span className="font-bold text-surface-800 text-sm block">PIX</span>
                        <span className="text-xs text-accent-700 font-medium">Instantâneo</span>
                      </button>
                    )}

                    {/* Card */}
                    {linkData.acceptCard && (
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('card')}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                          paymentMethod === 'card'
                            ? 'border-primary-500 bg-primary-50/50 shadow-sm'
                            : 'border-surface-200 hover:border-surface-300 bg-white'
                        }`}
                      >
                        <span className="text-2xl block mb-1">💳</span>
                        <span className="font-bold text-surface-800 text-sm block">Cartão</span>
                        <span className="text-xs text-surface-500">
                          {isRecurring ? 'Recorrência automática' : 'Crédito ou Débito'}
                        </span>
                      </button>
                    )}

                    {/* Boleto (only for ONE_TIME) */}
                    {linkData.acceptBoleto && !isRecurring && (
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('boleto')}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                          paymentMethod === 'boleto'
                            ? 'border-yellow-500 bg-yellow-50/50 shadow-sm'
                            : 'border-surface-200 hover:border-surface-300 bg-white'
                        }`}
                      >
                        <span className="text-2xl block mb-1">📄</span>
                        <span className="font-bold text-surface-800 text-sm block">Boleto</span>
                        <span className="text-xs text-surface-500">Até 3 dias úteis</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Submit Area */}
                <div className="border-t border-surface-100 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-surface-600 text-sm font-medium">
                      {isRecurring ? 'Total da assinatura:' : 'Total a pagar à vista:'}
                    </span>
                    <span className="text-2xl font-extrabold text-surface-800">
                      {formatCurrency(selectedPrice.amount)}
                      {isRecurring && <span className="text-xs font-normal text-surface-500">/{selectedPrice.interval === 'year' ? 'ano' : 'mês'}</span>}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={processing}
                    className={`w-full py-4 rounded-xl font-bold text-base transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer ${
                      paymentMethod === 'pix'
                        ? 'btn-success'
                        : isRecurring
                        ? 'btn-primary'
                        : paymentMethod === 'card'
                        ? 'btn-primary'
                        : 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white hover:from-yellow-600'
                    }`}
                  >
                    {processing ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Processando Pagamento...
                      </span>
                    ) : paymentMethod === 'pix' ? (
                      `🟢 Pagar ${formatCurrency(selectedPrice.amount)} com PIX Instantâneo`
                    ) : isRecurring ? (
                      `🔄 Assinar Plano por ${formatCurrency(selectedPrice.amount)}/${selectedPrice.interval === 'year' ? 'ano' : 'mês'}`
                    ) : paymentMethod === 'card' ? (
                      `💳 Pagar ${formatCurrency(selectedPrice.amount)} no Cartão à Vista`
                    ) : (
                      `📄 Gerar Boleto Bancário de ${formatCurrency(selectedPrice.amount)}`
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
