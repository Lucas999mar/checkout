import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { generateSlug } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const links = await prisma.paymentLink.findMany({
      include: {
        product: true,
        price: true,
        _count: { select: { payments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ links });
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
    let {
      productId,
      priceId,
      amount,
      priceType = 'ONE_TIME',
      interval = 'month',
      slug,
      title,
      description,
      maxUses,
      expiresAt,
      acceptPix = true,
      acceptCard = true,
      acceptBoleto = true,
      bankProvider = 'mercadopago',
      pixKey,
      pixBeneficiary,
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'Título do link é obrigatório' }, { status: 400 });
    }

    // Auto-generate slug if not provided
    if (!slug) {
      slug = generateSlug(title);
    } else {
      slug = generateSlug(slug);
    }

    // Check slug uniqueness
    let finalSlug = slug;
    let counter = 1;
    while (await prisma.paymentLink.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${slug}-${counter}`;
      counter++;
    }

    // If amount is provided directly, handle product and price creation/linking
    if (amount !== undefined && amount !== null && !priceId) {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });
      }

      // If no product selected, create a dedicated product for this link
      if (!productId) {
        const product = await prisma.product.create({
          data: {
            name: title,
            description: description || null,
          },
        });
        productId = product.id;
      }

      // Create the price record for this amount
      const price = await prisma.price.create({
        data: {
          productId,
          amount: parsedAmount,
          type: priceType,
          interval: priceType === 'RECURRING' ? interval : null,
          intervalCount: 1,
        },
      });
      priceId = price.id;
    }

    // If still missing product or price
    if (!productId || !priceId) {
      return NextResponse.json(
        { error: 'Informe um valor para o link ou selecione um produto e preço existente' },
        { status: 400 }
      );
    }

    const link = await prisma.paymentLink.create({
      data: {
        productId,
        priceId,
        slug: finalSlug,
        title,
        description: description || null,
        maxUses: maxUses ? parseInt(maxUses) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        acceptPix: acceptPix !== false,
        acceptCard: acceptCard !== false,
        acceptBoleto: acceptBoleto !== false,
        bankProvider: bankProvider || 'mercadopago',
        pixKey: pixKey || null,
        pixBeneficiary: pixBeneficiary || null,
        deliveryUrl: body.deliveryUrl || null,
        deliveryContent: body.deliveryContent || null,
      },
      include: { product: true, price: true },
    });

    return NextResponse.json({ link }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
