import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const products = await prisma.product.findMany({
      include: {
        prices: true,
        _count: { select: { payments: true, paymentLinks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ products });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, imageUrl, prices } = body;

    if (!name || !prices?.length) {
      return NextResponse.json(
        { error: 'Nome e pelo menos um preço são obrigatórios' },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        imageUrl,
        prices: {
          create: prices.map((p: any) => ({
            amount: p.amount,
            type: p.type || 'ONE_TIME',
            interval: p.interval || null,
            intervalCount: p.intervalCount || 1,
            trialDays: p.trialDays || 0,
          })),
        },
      },
      include: { prices: true },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
