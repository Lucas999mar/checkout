# 🚀 Guia Rápido de Inicialização

## Opção A: Usando Docker (Recomendado se tiver Docker Desktop)

Se você tem o Docker Desktop instalado:

```bash
cd c:\Users\lucas\Downloads\checkout-mercadopago

# 1. Inicie o PostgreSQL no Docker
docker compose up -d

# 2. Crie as tabelas no banco
npm run db:push

# 3. Popule com os dados de exemplo (admin, produtos, gráficos)
npm run db:seed

# 4. Inicie o servidor
npm run dev
```

---

## Opção B: Usando PostgreSQL Local ou na Nuvem (Supabase / Neon)

1. Se já tiver o PostgreSQL rodando na sua máquina ou um banco gratuito no [Neon](https://neon.tech) / [Supabase](https://supabase.com):
2. Edite o arquivo `.env`:
   ```env
   DATABASE_URL="postgresql://usuario:senha@localhost:5432/checkout_mercadopago?schema=public"
   ```
3. Execute:
   ```bash
   npm run db:push
   npm run db:seed
   npm run dev
   ```

---

## 🔑 Credenciais Padrão do Dashboard

- **URL:** [http://localhost:3000/login](http://localhost:3000/login)
- **Email:** `admin@checkout.com`
- **Senha:** `admin123`

## 🛒 Links de Demonstração Criados no Seed

- **Plano Starter:** [http://localhost:3000/pay/plano-starter](http://localhost:3000/pay/plano-starter)
- **Plano Pro Mensal:** [http://localhost:3000/pay/plano-pro-mensal](http://localhost:3000/pay/plano-pro-mensal)
- **Dashboard Admin:** [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

---

## ⚙️ Configuração do Mercado Pago Real

Para receber pagamentos reais ou em modo sandbox de teste:
1. Acesse: [https://www.mercadopago.com.br/developers/panel/app](https://www.mercadopago.com.br/developers/panel/app)
2. Obtenha seu **Access Token** e **Public Key** de Teste ou Produção.
3. Cole no seu `.env`:
   ```env
   MERCADOPAGO_ACCESS_TOKEN=TEST-...
   MERCADOPAGO_PUBLIC_KEY=TEST-...
   NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=TEST-...
   ```
4. Webhook em desenvolvimento local:
   - Execute o ngrok: `ngrok http 3000`
   - Cole a URL gerada no painel do MP: `https://xxxx.ngrok-free.app/api/webhooks/mercadopago`
   - Eventos para marcar: `Pagamentos` (`payment`) e `Planos e assinaturas` (`subscription_preapproval`).

