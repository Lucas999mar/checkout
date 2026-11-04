import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Criar admin padrão
  const passwordHash = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@checkout.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@checkout.com',
      passwordHash,
      role: 'ADMIN',
    },
  });
  console.log('✅ Admin criado:', admin.email);

  // Criar produtos de exemplo
  const product1 = await prisma.product.create({
    data: {
      name: 'Plano Starter',
      description: 'Ideal para quem está começando. Acesso a recursos básicos.',
      imageUrl: '/products/starter.png',
      prices: {
        create: [
          {
            amount: 29.90,
            type: 'ONE_TIME',
          },
          {
            amount: 19.90,
            type: 'RECURRING',
            interval: 'month',
            intervalCount: 1,
          },
        ],
      },
    },
  });

  const product2 = await prisma.product.create({
    data: {
      name: 'Plano Professional',
      description: 'Para profissionais que precisam de mais recursos e suporte.',
      imageUrl: '/products/pro.png',
      prices: {
        create: [
          {
            amount: 99.90,
            type: 'ONE_TIME',
          },
          {
            amount: 49.90,
            type: 'RECURRING',
            interval: 'month',
            intervalCount: 1,
          },
          {
            amount: 479.90,
            type: 'RECURRING',
            interval: 'year',
            intervalCount: 1,
          },
        ],
      },
    },
  });

  const product3 = await prisma.product.create({
    data: {
      name: 'Plano Enterprise',
      description: 'Solução completa para grandes empresas com suporte dedicado.',
      imageUrl: '/products/enterprise.png',
      prices: {
        create: [
          {
            amount: 299.90,
            type: 'ONE_TIME',
          },
          {
            amount: 199.90,
            type: 'RECURRING',
            interval: 'month',
            intervalCount: 1,
          },
        ],
      },
    },
  });

  console.log('✅ Produtos criados:', product1.name, product2.name, product3.name);

  // Criar clientes de exemplo
  const customers = await Promise.all([
    prisma.customer.create({
      data: { name: 'João Silva', email: 'joao@email.com', cpf: '12345678901', phone: '11999999999' },
    }),
    prisma.customer.create({
      data: { name: 'Maria Santos', email: 'maria@email.com', cpf: '98765432100', phone: '11888888888' },
    }),
    prisma.customer.create({
      data: { name: 'Pedro Oliveira', email: 'pedro@email.com', cpf: '11122233344', phone: '11777777777' },
    }),
  ]);
  console.log('✅ Clientes criados:', customers.length);

  // Criar links de pagamento de exemplo
  const prices = await prisma.price.findMany();
  
  if (prices.length > 0) {
    await prisma.paymentLink.create({
      data: {
        productId: product1.id,
        priceId: prices[0].id,
        slug: 'plano-starter',
        title: 'Plano Starter - Pagamento Único',
        description: 'Pague uma vez e tenha acesso vitalício ao Plano Starter',
        acceptPix: true,
        acceptCard: true,
        acceptBoleto: true,
      },
    });

    await prisma.paymentLink.create({
      data: {
        productId: product2.id,
        priceId: prices.find(p => p.amount === 49.90)?.id || prices[2].id,
        slug: 'plano-pro-mensal',
        title: 'Plano Professional - Mensal',
        description: 'Assinatura mensal do Plano Professional',
        acceptPix: true,
        acceptCard: true,
        acceptBoleto: false,
      },
    });
  }

  console.log('✅ Links de pagamento criados');

  // Criar pagamentos de exemplo para o dashboard
  const statuses: Array<'APPROVED' | 'PENDING' | 'REJECTED'> = ['APPROVED', 'PENDING', 'REJECTED'];
  const methods = ['pix', 'visa', 'master', 'bolbradesco'];
  const types = ['bank_transfer', 'credit_card', 'credit_card', 'ticket'];

  for (let i = 0; i < 50; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const statusIndex = Math.random() > 0.3 ? 0 : Math.random() > 0.5 ? 1 : 2;
    const methodIndex = Math.floor(Math.random() * methods.length);
    const customerIndex = Math.floor(Math.random() * customers.length);
    const amount = [29.90, 49.90, 99.90, 199.90, 299.90][Math.floor(Math.random() * 5)];

    await prisma.payment.create({
      data: {
        customerId: customers[customerIndex].id,
        productId: [product1.id, product2.id, product3.id][Math.floor(Math.random() * 3)],
        mpPaymentId: `${1000000000 + i}`,
        mpStatus: statuses[statusIndex].toLowerCase(),
        mpPaymentMethodId: methods[methodIndex],
        mpPaymentTypeId: types[methodIndex],
        amount,
        status: statuses[statusIndex],
        paidAt: statusIndex === 0 ? new Date(Date.now() - daysAgo * 86400000) : null,
        createdAt: new Date(Date.now() - daysAgo * 86400000),
      },
    });
  }

  console.log('✅ Pagamentos de exemplo criados: 50');
  console.log('\n🎉 Seed concluído com sucesso!');
  console.log('📧 Login: admin@checkout.com');
  console.log('🔑 Senha: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

