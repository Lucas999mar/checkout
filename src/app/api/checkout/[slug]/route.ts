import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
