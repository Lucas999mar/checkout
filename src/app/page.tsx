import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-surface-900 via-primary-950 to-surface-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full text-center space-y-12 animate-fade-in">
        {/* Hero */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-primary-300 text-sm font-medium backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-accent-400 animate-pulse" />
            Sistema de Pagamentos Ativo
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white">
            Checkout
            <span className="bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent"> Pro</span>
          </h1>
          <p className="text-xl text-surface-300 max-w-2xl mx-auto leading-relaxed">
            Sistema completo de pagamentos com Mercado Pago. PIX instantâneo, cartões, boleto,
            assinaturas recorrentes e painel administrativo profissional.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard
            icon="🟢"
            title="PIX Instantâneo"
            description="QR Code e Copia e Cola com confirmação em tempo real via webhook"
          />
          <FeatureCard
            icon="💳"
            title="Todos os Cartões"
            description="Visa, Mastercard, Elo, Amex, Hipercard e mais via checkout transparente"
          />
          <FeatureCard
            icon="🔄"
            title="Assinaturas"
            description="Planos recorrentes com cobrança automática mensal ou anual"
          />
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/dashboard"
            className="btn-primary text-lg px-8 py-4 inline-flex items-center gap-2"
          >
            📊 Painel Admin
          </Link>
          <Link
            href="/pay/plano-starter"
            className="btn-secondary bg-white/10 border-white/20 text-white hover:bg-white/20 text-lg px-8 py-4 inline-flex items-center gap-2"
          >
            🛒 Ver Checkout Demo
          </Link>
        </div>

        {/* Tech Stack */}
        <div className="pt-8 border-t border-white/10">
          <p className="text-surface-500 text-sm mb-4">Construído com</p>
          <div className="flex flex-wrap justify-center gap-4">
            {['Next.js 14', 'TypeScript', 'Tailwind CSS', 'Prisma', 'PostgreSQL', 'Mercado Pago API', 'WebSocket'].map(
              (tech) => (
                <span key={tech} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-surface-400 text-sm">
                  {tech}
                </span>
              )
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="glass-card bg-white/5 border-white/10 p-8 text-left hover:bg-white/10 transition-all duration-300 hover:-translate-y-1">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-surface-400">{description}</p>
    </div>
  );
}
