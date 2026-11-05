import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getPaymentStatus } from '@/lib/mercadopago';
import { deliverProduct } from '@/lib/delivery';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const searchParams = request.nextUrl.searchParams;

    // Log webhook for audit
    await prisma.webhookLog.create({
      data: {
        source: 'mercadopago',
        eventType: body.type || body.action || searchParams.get('type') || 'unknown',
        payload: JSON.stringify(body),
      },
    });

    const type = body.type || searchParams.get('type');
    const dataId = body.data?.id || searchParams.get('data.id');

    if (!dataId) {
      return NextResponse.json({ status: 'no data id' }, { status: 200 });
    }

    // Handle payment notification
    if (type === 'payment') {
      const mpStatus = await getPaymentStatus(dataId.toString());

      // Find payment by MP payment ID
      const payment = await prisma.payment.findFirst({
        where: {
          OR: [
            { mpPaymentId: dataId.toString() },
            { id: mpStatus.id || '' },
          ],
        },
      });

      if (payment) {
        const newStatus = mapMpStatus(mpStatus.status || '');
        
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            mpPaymentId: dataId.toString(),
            mpStatus: mpStatus.status,
            mpStatusDetail: mpStatus.statusDetail,
            mpPaymentMethodId: mpStatus.paymentMethodId,
            mpPaymentTypeId: mpStatus.paymentTypeId,
            status: newStatus,
            paidAt: mpStatus.status === 'approved' ? new Date(mpStatus.dateApproved || Date.now()) : null,
          },
        });

        // Se o pagamento foi aprovado, dispara automaticamente a entrega digital
        if (newStatus === 'APPROVED' && payment.deliveryStatus !== 'DELIVERED') {
          try {
            await deliverProduct(payment.id);
          } catch (deliveryErr) {
            console.error('Erro na entrega automática via webhook MP:', deliveryErr);
          }
        }

        // Update webhook log as processed
        await prisma.webhookLog.updateMany({
          where: { payload: { contains: String(dataId) } },
          data: { processed: true },
        });
      }
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error: any) {
    console.error('Webhook error:', error);
    // Always return 200 to prevent MP from retrying
    return NextResponse.json({ status: 'error', message: error.message }, { status: 200 });
  }
}

function mapMpStatus(mpStatus: string): 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REFUNDED' | 'IN_PROCESS' | 'EXPIRED' {
  const mapping: Record<string, any> = {
    approved: 'APPROVED',
    pending: 'PENDING',
    authorized: 'APPROVED',
    in_process: 'IN_PROCESS',
    in_mediation: 'IN_PROCESS',
    rejected: 'REJECTED',
    cancelled: 'CANCELLED',
    refunded: 'REFUNDED',
    charged_back: 'REFUNDED',
  };
  return mapping[mpStatus] || 'PENDING';
}

// Mercado Pago also sends GET requests sometimes
export async function GET() {
  return NextResponse.json({ status: 'webhook endpoint active' });
}
