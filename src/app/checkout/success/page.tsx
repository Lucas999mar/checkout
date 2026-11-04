import Link from 'next/link';

export default function CheckoutSuccessPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-accent-50 to-accent-100 flex items-center justify-center p-4">
      <div className="glass-card p-12 text-center max-w-lg animate-slide-up">
        <div className="w-24 h-24 rounded-full bg-accent-100 flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-accent-600" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-surface-800 mb-3">Pagamento Aprovado! 🎉</h1>
        <p className="text-surface-500 text-lg mb-8">
          Seu pagamento foi processado com sucesso. Você receberá um email de confirmação.
        </p>
        <Link href="/" className="btn-primary inline-flex items-center gap-2">
          Voltar ao Início
        </Link>
      </div>
    </main>
  );
}
