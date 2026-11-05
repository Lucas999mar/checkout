import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { deliverProduct } from '@/lib/delivery';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const method = searchParams.get('method');
    const search = searchParams.get('search');

    const where: any = {};
    if (status) where.status = status;
    if (method) where.mpPaymentMethodId = method;
    if (search) {
      where.OR = [
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { email: { contains: search, mode: 'insensitive' } } },
        { mpPaymentId: { contains: search } },
      ];
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: { customer: true, product: true, paymentLink: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return NextResponse.json({
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
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

    const { paymentId, action } = await request.json();

    if (!paymentId) {
      return NextResponse.json({ error: 'paymentId é obrigatório' }, { status: 400 });
    }

    if (action === 'approve') {
      const payment = await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'APPROVED',
          mpStatus: 'approved',
          mpStatusDetail: 'accredited',
          paidAt: new Date(),
        },
        include: { customer: true, product: true, paymentLink: true },
      });

      let delivery = null;
      try {
        delivery = await deliverProduct(payment.id);
      } catch (err: any) {
        console.error('Erro ao entregar produto:', err.message);
      }

      return NextResponse.json({ success: true, payment, delivery });
    }

    if (action === 'deliver') {
      const delivery = await deliverProduct(paymentId);
      return NextResponse.json({ success: true, delivery });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

