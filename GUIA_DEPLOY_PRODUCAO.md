# 🚀 Guia Oficial de Deploy em Produção (GitHub + Supabase + Vercel)

Este guia contém o passo a passo exato e simplificado para colocar o seu **Checkout Multi-Bancos & Mercado Pago** no ar em produção, com banco de dados PostgreSQL gratuito no Supabase, hospedagem na Vercel e código versionado no GitHub.

---

## 📋 Sumário
1. [Passo 1: Criar o Banco PostgreSQL no Supabase](#-passo-1-criar-o-banco-postgresql-no-supabase-gratuito)
2. [Passo 2: Subir o Código no seu GitHub](#-passo-2-subir-o-código-no-seu-github)
3. [Passo 3: Fazer o Deploy na Vercel](#-passo-3-fazer-o-deploy-na-vercel)
4. [Passo 4: Configurar o Webhook no Mercado Pago](#-passo-4-configurar-o-webhook-no-mercado-pago)

---

## 🏦 Passo 1: Criar o Banco PostgreSQL no Supabase (Gratuito)

O **Supabase** oferece PostgreSQL de alta performance totalmente gratuito.

1. Acesse [supabase.com](https://supabase.com) e faça login (pode usar sua conta do GitHub).
2. Clique em **"New Project"**.
3. Preencha:
   - **Name**: `checkout-pro` (ou o nome que preferir)
   - **Database Password**: Escolha uma senha forte (anote essa senha!).
   - **Region**: Selecione `São Paulo (sa-east-1)` para menor latência no Brasil.
4. Clique em **"Create new project"** e aguarde cerca de 1 a 2 minutos.
5. Quando o projeto estiver pronto:
   - No menu lateral esquerdo, clique no ícone de engrenagem ⚙️ **Project Settings** > **Database**.
   - Role até a seção **Connection parameters** ou **Connection string**.
   - Selecione a aba **URI** e o modo **Transaction** (porta 6543) ou **Session** (porta 5432).
   - Copie a string. Ela terá o formato:
     ```text
     postgresql://postgres.[PROJECT-REF]:[SUA-SENHA]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
     ```
   - Substitua `[SUA-SENHA]` pela senha que você definiu ao criar o projeto.

### ⚡ Criar as tabelas no Supabase com 1 comando:
No seu terminal local (dentro da pasta `checkout-mercadopago`), coloque a URL do Supabase no seu arquivo `.env`:
```env
DATABASE_URL="sua-string-do-supabase-aqui"
```
E execute:
```bash
npm run db:push
npm run db:seed
```
Pronto! Todas as tabelas (`users`, `products`, `prices`, `payment_links`, `bank_configs`, `payments`) serão criadas automaticamente no Supabase, e o usuário administrador padrão (`admin@checkout.com` / `admin123`) será inserido!

---

## 🐙 Passo 2: Subir o Código no seu GitHub

1. Acesse [github.com/new](https://github.com/new).
2. Crie um novo repositório:
   - **Repository name**: `checkout-mercadopago` (ou `checkout-pro`)
   - **Visibility**: `Public` ou `Private` (recomendamos `Private`)
   - **NÃO** marque as opções de "Add a README" nem ".gitignore" (o projeto já tem os seus prontos).
   - Clique em **"Create repository"**.

3. No terminal do seu computador (dentro da pasta `checkout-mercadopago`), execute:
```bash
git add .
git commit -m "feat: checkout pro multi-bancos e mercado pago v1.0"
git branch -M main
git remote add origin https://github.com/Lucas999mar/checkout-mercadopago.git
git push -u origin main
```
*(Caso seu repositório tenha outro nome, apenas substitua `checkout-mercadopago` pelo nome escolhido).*

---

## ☁️ Passo 3: Fazer o Deploy na Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login com seu GitHub.
2. No painel principal, clique no botão **"Add New..."** > **"Project"**.
3. Em **"Import Git Repository"**, localize o repositório `checkout-mercadopago` que acabou de subir e clique em **"Import"**.
4. Na tela de configuração:
   - **Framework Preset**: Detectará automaticamente `Next.js`.
   - **Root Directory**: `./` (padrão)
   - Abra a seção **Environment Variables** (Variáveis de Ambiente) e adicione:

| Chave (Key) | Valor (Value) | Descrição |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://postgres...` | A URL do banco do Supabase obtida no Passo 1 |
| `JWT_SECRET` | `uma_chave_secreta_bem_longa_e_aleatoria` | Chave para assinar os tokens JWT do login |
| `NEXTAUTH_SECRET` | `mesma_chave_secreta_acima` | Segredo de sessão |
| `MERCADOPAGO_ACCESS_TOKEN` | `APP_USR-...` | Seu Access Token de Produção ou Teste do Mercado Pago |
| `MERCADOPAGO_PUBLIC_KEY` | `APP_USR-...` | Sua Public Key do Mercado Pago |
| `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` | `APP_USR-...` | Mesma Public Key do Mercado Pago |
| `NEXT_PUBLIC_APP_URL` | `https://seu-projeto.vercel.app` | A URL que a Vercel gerar (atualize após o primeiro deploy) |

5. Clique em **"Deploy"**!
6. A Vercel irá:
   - Instalar dependências (`npm install`)
   - Gerar o Prisma Client (`prisma generate`)
   - Compilar o Next.js 14 em modo otimizado
   - Publicar sua aplicação com HTTPS e CDN global gratuita em menos de 2 minutos!

---

## 📡 Passo 4: Configurar o Webhook no Mercado Pago

Para receber a confirmação automática imediata de pagamentos de cartão e boleto:

1. Acesse o painel de desenvolvedor do Mercado Pago: [mercadopago.com.br/developers/panel/app](https://www.mercadopago.com.br/developers/panel/app)
2. Selecione sua aplicação e clique em **Webhooks** ou **Notificações IPN**.
3. Em **URL de Produção**, insira:
   ```text
   https://seu-projeto.vercel.app/api/webhooks/mercadopago
   ```
4. Em **Eventos**, marque:
   - ✅ **Pagamentos** (`payment`)
   - ✅ **Planos e Assinaturas** (`subscription` ou `preapproval`)
5. Clique em **Salvar**.

---

## 🔒 Acesso ao Painel em Produção

Após o deploy:
- **Painel Administrativo**: `https://seu-projeto.vercel.app/dashboard`
- **Login Inicial**: `admin@checkout.com`
- **Senha Inicial**: `admin123`
*(Recomendamos alterar a senha no banco ou adicionar novos administradores assim que entrar).*
