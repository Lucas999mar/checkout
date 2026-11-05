export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#060b17] via-[#0b132b] to-[#070d1e] text-white flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 selection:bg-emerald-500 selection:text-white">
      {/* Container Central */}
      <div className="max-w-5xl mx-auto w-full my-auto space-y-16 animate-fade-in">
        
        {/* ── HERO SECTION ─────────────────────────────────────────── */}
        <section className="text-center space-y-6 pt-6">
          {/* Logo Oficial com Efeito de Glow */}
          <div className="flex justify-center relative">
            <div className="absolute -inset-4 bg-emerald-500/10 rounded-full blur-2xl" />
            <img
              src="/logo.png"
              alt="aiCheckout"
              className="relative w-32 h-32 md:w-40 md:h-40 rounded-full object-cover shadow-2xl border-4 border-white/10 hover:scale-105 transition-all duration-300"
            />
          </div>

          {/* Badge de Status do Sistema */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-emerald-400 text-xs sm:text-sm font-medium backdrop-blur-md shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Infraestrutura Ativa • Processamento & Entrega Automática</span>
          </div>

          {/* Título Principal */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
            ai<span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">Checkout</span>
          </h1>

          {/* Subtítulo Descritivo */}
          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            Tecnologia de alta conversão em pagamentos digitais. Processamento instantâneo via PIX e cartões com liberação automatizada de infoprodutos via WhatsApp e E-mail.
          </p>

          {/* Métricas / Selos de Desempenho */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 pt-4 text-xs sm:text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold text-base">⚡ 0.8s</span>
              <span>Tempo de Aprovação</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold text-base">🛡️ 100%</span>
              <span>Criptografia Ponta a Ponta</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold text-base">📲 Instantânea</span>
              <span>Entrega no WhatsApp</span>
            </div>
          </div>
        </section>

        {/* ── GRID DE RECURSOS E DIFERENCIAIS ──────────────────────── */}
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon="🟢"
            badge="Multibancos"
            title="PIX Instantâneo"
            description="QR Code e Copia e Cola compatíveis com 100% dos bancos brasileiros (Nubank, Inter, Itaú, Bradesco, Santander, BB, Caixa e C6)."
          />
          <FeatureCard
            icon="📲"
            badge="Automação"
            title="Disparo via WhatsApp"
            description="Envio imediato do arquivo, link do curso, vídeo ou chave de acesso para o WhatsApp do cliente assim que o pagamento é confirmado."
          />
          <FeatureCard
            icon="✉️"
            badge="Notificação"
            title="Entrega por E-mail"
            description="Comprovante detalhado de compra com instruções de acesso e link direto de download enviado instantaneamente para o comprador."
          />
          <FeatureCard
            icon="💳"
            badge="Conversão"
            title="Cartão & Assinaturas"
            description="Ambiente transparente para pagamentos à vista ou cobranças recorrentes com suporte às principais bandeiras nacionais e internacionais."
          />
          <FeatureCard
            icon="📦"
            badge="Infoprodutos"
            title="Formatos Flexíveis"
            description="Compatível com PDFs, documentos, apostilas, planilhas, links de membros, cursos e códigos de ativação em nuvem de alta velocidade."
          />
          <FeatureCard
            icon="🔒"
            badge="Segurança"
            title="Blindagem SSL 256-Bit"
            description="Arquitetura protegida com criptografia militar de dados, auditoria de transações e conformidade estrita aos padrões do Banco Central."
          />
        </section>

        {/* ── COMO FUNCIONA O FLUXO ─────────────────────────────────── */}
        <section className="p-8 sm:p-10 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-md space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Como Funciona a Experiência</h2>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">
              Simples, seguro e sem fricção para quem compra e para quem vende.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 pt-2">
            <div className="flex flex-col items-center text-center space-y-3 p-5 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-extrabold text-lg">
                1
              </div>
              <h3 className="font-bold text-white text-base">Checkout Seguro</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                O comprador escolhe a forma de pagamento e efetua a transação em um ambiente blindado e veloz.
              </p>
            </div>

            <div className="flex flex-col items-center text-center space-y-3 p-5 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center font-extrabold text-lg">
                2
              </div>
              <h3 className="font-bold text-white text-base">Validação Bancária</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                O sistema identifica e confirma o recebimento dos fundos em tempo real com alta precisão.
              </p>
            </div>

            <div className="flex flex-col items-center text-center space-y-3 p-5 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-extrabold text-lg">
                3
              </div>
              <h3 className="font-bold text-white text-base">Entrega Imediata</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                O infoproduto é liberado na tela para download e enviado automaticamente para o WhatsApp e E-mail.
              </p>
            </div>
          </div>
        </section>

        {/* ── BANNER DE CONFIANÇA ──────────────────────────────────── */}
        <section className="text-center space-y-4 py-2">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <span>🏦</span> Padrão BACEN PIX
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <span>🔒</span> Certificado SSL 256-Bit
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <span>⚡</span> Uptime Garantido 99.9%
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <span>🛡️</span> Proteção Antifraude
            </span>
          </div>
        </section>

      </div>

      {/* ── FOOTER INSTITUCIONAL ───────────────────────────────────── */}
      <footer className="mt-16 pt-8 border-t border-white/10 text-center text-xs text-slate-500 max-w-5xl mx-auto w-full space-y-2">
        <p className="font-medium text-slate-400">
          © {new Date().getFullYear()} aiCheckout • Tecnologia em Pagamentos Digitais & Entrega Automatizada.
        </p>
        <p className="text-[11px] text-slate-500">
          Todos os direitos reservados. Plataforma segura de processamento de pagamentos.
        </p>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  badge,
  title,
  description,
}: {
  icon: string;
  badge: string;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative p-6 sm:p-7 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-emerald-500/30 transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-emerald-500/5 text-left flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-3xl sm:text-4xl group-hover:scale-110 transition-transform">{icon}</span>
          <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full bg-white/10 text-emerald-300 border border-white/10">
            {badge}
          </span>
        </div>
        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-300 transition-colors">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
