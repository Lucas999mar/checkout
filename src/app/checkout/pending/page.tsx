import Link from 'next/link';

export default function CheckoutPendingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-50 to-yellow-100 flex items-center justify-center p-4">
      <div className="glass-card p-12 text-center max-w-lg animate-slide-up">
        <div className="w-24 h-24 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-yellow-600 animate-spin" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-surface-800 mb-3">Pagamento Pendente ⏳</h1>
        <p className="text-surface-500 text-lg mb-8">
          Seu pagamento está sendo processado. Você será notificado quando for confirmado.
        </p>
        <Link href="/" className="btn-secondary inline-flex items-center gap-2">
          Voltar ao Início
        </Link>
      </div>
    </main>
  );
}
