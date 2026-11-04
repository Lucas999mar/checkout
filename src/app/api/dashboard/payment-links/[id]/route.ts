import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id } = params;
    await prisma.paymentLink.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    const link = await prisma.paymentLink.update({
      where: { id },
      data: {
        active: body.active !== undefined ? body.active : undefined,
      },
    });

    return NextResponse.json({ link });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

