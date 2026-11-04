import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getPaymentStatus } from '@/lib/mercadopago';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check local DB first
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { customer: true, product: true },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 });
    }

    // If pending and has MP payment ID, check real-time status
    if (payment.status === 'PENDING' && payment.mpPaymentId) {
      try {
        const mpStatus = await getPaymentStatus(payment.mpPaymentId);
        
        if (mpStatus.status === 'approved') {
          await prisma.payment.update({
            where: { id },
            data: {
              status: 'APPROVED',
              mpStatus: mpStatus.status,
              mpStatusDetail: mpStatus.statusDetail,
              paidAt: mpStatus.dateApproved ? new Date(mpStatus.dateApproved) : new Date(),
            },
          });
          payment.status = 'APPROVED';
          payment.mpStatus = 'approved';
        }
      } catch (e) {
        // MP API might fail, just return local status
      }
    }

    return NextResponse.json({ payment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
