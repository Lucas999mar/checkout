# 🛒 Checkout Pro - Sistema de Pagamentos com Mercado Pago

Sistema completo de checkout e pagamentos com integração Mercado Pago, incluindo PIX instantâneo, cartões, boleto, assinaturas recorrentes e painel administrativo profissional.

## ✨ Funcionalidades

### 🛒 Checkout
- **PIX Instantâneo** - QR Code + Copia e Cola com confirmação em tempo real
- **Cartão de Crédito/Débito** - Visa, Mastercard, Elo, Amex, Hipercard
- **Boleto Bancário** - Geração automática via Mercado Pago
- **Assinaturas Recorrentes** - Planos mensais e anuais

### 🔗 Links de Pagamento
- Geração de links únicos por produto/plano
- Suporte a pagamento único e recorrente
- URLs amigáveis (ex: `/pay/meu-produto`)
- Controle de limite de usos e expiração
- Seleção de métodos aceitos por link

### ⚡ Confirmação Instantânea
- Webhooks do Mercado Pago para atualização em tempo real
- Polling automático no frontend para PIX
- Logs de webhook para auditoria

### 📊 Dashboard Admin
- Visão geral com métricas de vendas
- Gráfico de receita dos últimos 30 dias
- Distribuição por método de pagamento
- Lista de pagamentos com filtros e paginação
- Gerenciamento de produtos e preços
- Gerenciamento de links de pagamento
- Acompanhamento de assinaturas

## 🛠️ Tech Stack

| Tecnologia | Uso |
|---|---|
| **Next.js 14** | Framework fullstack (App Router) |
| **TypeScript** | Tipagem estática |
| **Tailwind CSS** | Estilização |
| **Prisma** | ORM e migrations |
| **PostgreSQL** | Banco de dados |
| **Mercado Pago SDK** | Integração de pagamentos |
| **Chart.js** | Gráficos do dashboard |
| **JWT (jose)** | Autenticação admin |

## 🚀 Como Usar

### 1. Pré-requisitos
- Node.js 18+
- PostgreSQL instalado e rodando
- Conta no [Mercado Pago Developers](https://www.mercadopago.com.br/developers)

### 2. Instalação

```bash
# Clone o repositório
cd checkout-mercadopago

# Instale as dependências
npm install

# Copie o .env de exemplo
cp .env.example .env
```

### 3. Configuração

Edite o `.env` com suas credenciais:

```env
# Mercado Pago (obtenha em mercadopago.com.br/developers/panel/app)
MERCADOPAGO_ACCESS_TOKEN=seu-access-token
MERCADOPAGO_PUBLIC_KEY=sua-public-key
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=sua-public-key

# PostgreSQL
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/checkout_mercadopago"

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
JWT_SECRET=sua-chave-secreta-aqui
```

### 4. Banco de Dados

```bash
# Gerar Prisma Client
npx prisma generate

# Criar tabelas
npx prisma db push

# Popular com dados de exemplo
npx tsx prisma/seed.ts
```

### 5. Executar

```bash
npm run dev
```

Acesse:
- **Landing Page:** http://localhost:3000
- **Dashboard:** http://localhost:3000/dashboard
- **Checkout Demo:** http://localhost:3000/pay/plano-starter
- **Login:** admin@checkout.com / admin123

## 📁 Estrutura do Projeto

```
checkout-mercadopago/
├── prisma/
│   ├── schema.prisma      # Schema do banco de dados
│   └── seed.ts             # Dados iniciais
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/           # Login, logout, verificação
│   │   │   ├── checkout/       # API pública para links
│   │   │   ├── dashboard/      # APIs do painel admin
│   │   │   ├── payments/       # Criar PIX, preferência, assinatura
│   │   │   └── webhooks/       # Webhook do Mercado Pago
│   │   ├── checkout/           # Páginas de resultado
│   │   ├── dashboard/          # Painel administrativo
│   │   ├── login/              # Página de login
│   │   ├── pay/[slug]/         # Checkout público
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx            # Landing page
│   └── lib/
│       ├── auth.ts             # JWT authentication
│       ├── mercadopago.ts      # Mercado Pago helpers
│       ├── prisma.ts           # Prisma client
│       └── utils.ts            # Utilidades
├── .env.example
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## 🔧 Webhook (Produção)

Para receber notificações em tempo real do Mercado Pago:

1. Use [ngrok](https://ngrok.com/) para dev local: `ngrok http 3000`
2. Configure a URL no [Painel do Desenvolvedor](https://www.mercadopago.com.br/developers/panel/app)
3. URL: `https://seu-dominio.com/api/webhooks/mercadopago`
4. Eventos: `payment`, `subscription_preapproval`

## 📱 Fluxo de Pagamento PIX

```
Cliente → Preenche dados → Seleciona PIX
                ↓
Backend → Cria pagamento na API do MP
                ↓
MP retorna → QR Code + Código Copia e Cola
                ↓
Cliente → Paga no app do banco
                ↓
MP envia → Webhook para /api/webhooks/mercadopago
                ↓
Backend → Atualiza status para APPROVED
                ↓
Frontend → Polling detecta e mostra confirmação ✅
```

## 📄 Licença

MIT

