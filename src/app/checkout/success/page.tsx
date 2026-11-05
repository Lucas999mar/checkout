'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SuccessContent() {
  const searchParams = useSearchParams();
  const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id');
  const slug = searchParams.get('slug') || searchParams.get('external_reference');
  const status = searchParams.get('status') || searchParams.get('collection_status');

  const [deliveryInfo, setDeliveryInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function confirmExternalPayment() {
      if (!paymentId && !slug) return;
      try {
        setLoading(true);
        if (paymentId) {
          const res = await fetch(`/api/payments/status/${paymentId}?confirm=true`, {
            method: 'POST',
          });
          const data = await res.json();
          if (data.delivery) {
            setDeliveryInfo(data.delivery);
          }
        } else if (slug && status === 'approved') {
          const res = await fetch(`/api/webhooks/external?slug=${slug}&status=approved`, {
            method: 'POST',
          });
          const data = await res.json();
          if (data.paymentId) {
            const statusRes = await fetch(`/api/payments/status/${data.paymentId}`);
            const statusData = await statusRes.json();
            if (statusData.delivery) {
              setDeliveryInfo(statusData.delivery);
            }
          }
        }
      } catch (err) {
        console.error('Error confirming payment:', err);
      } finally {
        setLoading(false);
      }
    }
    confirmExternalPayment();
  }, [paymentId, slug, status]);

  const isDownload = deliveryInfo?.deliveryType === 'DOWNLOAD';
  const isVideo = deliveryInfo?.deliveryType === 'VIDEO';
  const isCourse = deliveryInfo?.deliveryType === 'ACCESS_LINK';

  let actionLabel = '📥 Baixar Meu Arquivo / PDF Agora';
  if (isVideo) actionLabel = '🎬 Assistir Vídeo / Acessar Aulas';
  else if (isCourse) actionLabel = '🎓 Acessar Área de Membros / Curso';
  else if (deliveryInfo?.deliveryType === 'CUSTOM_TEXT') actionLabel = '🔑 Visualizar Conteúdo';

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-surface-50 to-blue-50 flex items-center justify-center p-4">
      <div className="glass-card p-8 sm:p-12 text-center max-w-lg w-full animate-slide-up shadow-2xl border-2 border-emerald-200">
        <div className="w-20 h-20 rounded-full bg-emerald-100 border-4 border-emerald-200 flex items-center justify-center mx-auto mb-6 shadow-sm">
          <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 mb-3">
          ✓ Transação Aprovada & Confirmada
        </span>

        <h1 className="text-3xl font-black text-surface-900 tracking-tight mb-2">
          Pagamento Concluído! 🎉
        </h1>
        <p className="text-surface-600 text-sm mb-6 leading-relaxed">
          Seu pagamento foi aprovado com sucesso pelo banco. Seu acesso e comprovante foram gerados.
        </p>

        {/* Informações de Entrega Automática */}
        {deliveryInfo && deliveryInfo.deliveryType !== 'NONE' && (
          <div className="p-5 bg-emerald-50/70 border border-emerald-300 rounded-2xl mb-6 text-left space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎁</span>
              <div>
                <p className="font-bold text-emerald-950 text-sm">Seu Acesso Está Liberado:</p>
                <p className="text-xs text-emerald-700">Enviamos também cópia no seu WhatsApp!</p>
              </div>
            </div>

            {deliveryInfo.deliveryUrl && (
              <a
                href={deliveryInfo.deliveryUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-success w-full py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-md"
              >
                <span>{actionLabel}</span>
                <span>➔</span>
              </a>
            )}

            {deliveryInfo.deliveryContent && (
              <div className="p-3 bg-white rounded-xl border border-emerald-200 text-xs font-mono text-emerald-900 break-all">
                {deliveryInfo.deliveryContent}
              </div>
            )}
          </div>
        )}

        {/* WhatsApp notification indicator */}
        <div className="flex items-center justify-center gap-2 text-xs text-surface-500 mb-6 bg-surface-100/70 py-2.5 px-4 rounded-xl">
          <span className="text-base">📲</span>
          <span>Entrega automática sincronizada via WhatsApp e E-mail.</span>
        </div>

        <Link
          href="/"
          className="btn-secondary inline-flex items-center justify-center gap-2 text-sm font-semibold w-full py-3"
        >
          Voltar ao Início
        </Link>
      </div>
    </main>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-surface-50 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin" />
        </main>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
