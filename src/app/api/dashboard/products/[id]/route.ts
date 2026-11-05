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
    await prisma.product.delete({ where: { id } });
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

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name : undefined,
        description: body.description !== undefined ? body.description : undefined,
        imageUrl: body.imageUrl !== undefined ? body.imageUrl : undefined,
        deliveryType: body.deliveryType !== undefined ? body.deliveryType : undefined,
        deliveryUrl: body.deliveryUrl !== undefined ? body.deliveryUrl : undefined,
        deliveryFileName: body.deliveryFileName !== undefined ? body.deliveryFileName : undefined,
        deliveryFileSize: body.deliveryFileSize !== undefined ? body.deliveryFileSize : undefined,
        deliveryContent: body.deliveryContent !== undefined ? body.deliveryContent : undefined,
        deliveryInstructions: body.deliveryInstructions !== undefined ? body.deliveryInstructions : undefined,
        notifyEmail: body.notifyEmail !== undefined ? body.notifyEmail : undefined,
        notifyWhatsapp: body.notifyWhatsapp !== undefined ? body.notifyWhatsapp : undefined,
        active: body.active !== undefined ? body.active : undefined,
      },
      include: { prices: true },
    });

    return NextResponse.json({ product });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

