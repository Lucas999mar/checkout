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

    // Buscar logs de entrega mais recentes
    const logs = await prisma.deliveryLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    // Buscar ou inicializar configuração de disparo
    let config = await prisma.deliveryConfig.findFirst();
    if (!config) {
      config = await prisma.deliveryConfig.create({
        data: {
          emailSenderName: 'Checkout Pro',
          emailSenderAddress: 'onboarding@resend.dev',
        },
      });
    }

    // Estatísticas rápidas
    const totalDeliveries = await prisma.deliveryLog.count();
    const successfulDeliveries = await prisma.deliveryLog.count({ where: { status: 'SUCCESS' } });
    const failedDeliveries = await prisma.deliveryLog.count({ where: { status: 'FAILED' } });

    return NextResponse.json({
      logs,
      config,
      stats: {
        total: totalDeliveries,
        success: successfulDeliveries,
        failed: failedDeliveries,
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

    const body = await request.json();
    const {
      emailSenderName,
      emailSenderAddress,
      resendApiKey,
      whatsappApiUrl,
      whatsappApiKey,
      whatsappInstance,
      whatsappDefaultMsg,
    } = body;

    let config = await prisma.deliveryConfig.findFirst();

    if (config) {
      config = await prisma.deliveryConfig.update({
        where: { id: config.id },
        data: {
          emailSenderName: emailSenderName || 'Checkout Pro',
          emailSenderAddress: emailSenderAddress || 'onboarding@resend.dev',
          resendApiKey: resendApiKey !== undefined ? resendApiKey : null,
          whatsappApiUrl: whatsappApiUrl !== undefined ? whatsappApiUrl : null,
          whatsappApiKey: whatsappApiKey !== undefined ? whatsappApiKey : null,
          whatsappInstance: whatsappInstance !== undefined ? whatsappInstance : null,
          whatsappDefaultMsg: whatsappDefaultMsg !== undefined ? whatsappDefaultMsg : null,
        },
      });
    } else {
      config = await prisma.deliveryConfig.create({
        data: {
          emailSenderName: emailSenderName || 'Checkout Pro',
          emailSenderAddress: emailSenderAddress || 'onboarding@resend.dev',
          resendApiKey: resendApiKey || null,
          whatsappApiUrl: whatsappApiUrl || null,
          whatsappApiKey: whatsappApiKey || null,
          whatsappInstance: whatsappInstance || null,
          whatsappDefaultMsg: whatsappDefaultMsg || null,
        },
      });
    }

    return NextResponse.json({ config, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
