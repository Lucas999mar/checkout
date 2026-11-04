import Link from 'next/link';

export default function CheckoutFailurePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
      <div className="glass-card p-12 text-center max-w-lg animate-slide-up">
        <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-surface-800 mb-3">Pagamento Recusado 😔</h1>
        <p className="text-surface-500 text-lg mb-8">
          Infelizmente seu pagamento não foi aprovado. Tente novamente com outro método de pagamento.
        </p>
        <Link href="/" className="btn-danger inline-flex items-center gap-2">
          Tentar Novamente
        </Link>
      </div>
    </main>
  );
}
