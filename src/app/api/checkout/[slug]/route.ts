import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    const link = await prisma.paymentLink.findUnique({
      where: { slug },
      include: {
        product: {
          include: {
            prices: true,
          },
        },
        price: true,
      },
    });

    if (!link) {
      return NextResponse.json({ error: 'Link de pagamento não encontrado' }, { status: 404 });
    }

    if (!link.active) {
      return NextResponse.json({ error: 'Este link de pagamento está inativo' }, { status: 410 });
    }

    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Este link de pagamento expirou' }, { status: 410 });
    }

    if (link.maxUses && link.usedCount >= link.maxUses) {
      return NextResponse.json({ error: 'Este link atingiu o limite de usos' }, { status: 410 });
    }

    return NextResponse.json({
      link: {
        id: link.id,
        slug: link.slug,
        title: link.title,
        description: link.description,
        linkType: link.linkType || 'INTERNAL',
        externalUrl: link.externalUrl || null,
        redirectClicks: link.redirectClicks || 0,
        product: {
          id: link.product.id,
          name: link.product.name,
          description: link.product.description,
          imageUrl: link.product.imageUrl,
          prices: link.product.prices.map((p) => ({
            id: p.id,
            amount: p.amount,
            type: p.type,
            interval: p.interval,
            intervalCount: p.intervalCount,
          })),
        },
        price: {
          id: link.price.id,
          amount: link.price.amount,
          type: link.price.type,
          interval: link.price.interval,
          intervalCount: link.price.intervalCount,
        },
        acceptPix: link.acceptPix,
        acceptCard: link.acceptCard,
        acceptBoleto: link.acceptBoleto,
        bankProvider: link.bankProvider || 'mercadopago',
        pixKey: link.pixKey || null,
        pixBeneficiary: link.pixBeneficiary || null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const body = await request.json().catch(() => ({}));

    const link = await prisma.paymentLink.findUnique({
      where: { slug },
      include: { product: true, price: true },
    });

    if (!link) {
      return NextResponse.json({ error: 'Link de pagamento não encontrado' }, { status: 404 });
    }

    // Incrementar contagem de acessos / cliques do link
    await prisma.paymentLink.update({
      where: { id: link.id },
      data: {
        redirectClicks: { increment: 1 },
        usedCount: { increment: 1 },
      },
    });

    // Se houver cliente, salvar ou vincular
    let customerId: string | null = null;
    if (body.email) {
      const email = body.email.toLowerCase().trim();
      const customer = await prisma.customer.upsert({
        where: { email },
        update: {
          name: body.name || undefined,
          phone: body.phone || undefined,
          cpf: body.cpf || undefined,
        },
        create: {
          email,
          name: body.name || 'Cliente Link',
          phone: body.phone || null,
          cpf: body.cpf || null,
        },
      });
      customerId = customer.id;
    }

    // Criar registro de pagamento em aberto / intenção para acompanhamento e conciliação
    const payment = await prisma.payment.create({
      data: {
        paymentLinkId: link.id,
        productId: link.productId,
        customerId: customerId,
        amount: link.price.amount,
        currency: link.price.currency || 'BRL',
        status: 'PENDING',
        bankProvider: link.bankProvider || 'external',
        metadata: JSON.stringify({
          slug: link.slug,
          linkType: link.linkType,
          externalUrl: link.externalUrl,
          customerName: body.name || null,
          customerPhone: body.phone || null,
          customerEmail: body.email || null,
          initiatedAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      externalUrl: link.externalUrl,
      slug: link.slug,
    });
  } catch (error: any) {
    console.error('Error tracking payment link click:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
