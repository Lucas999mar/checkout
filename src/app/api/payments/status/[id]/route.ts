import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getPaymentStatus } from '@/lib/mercadopago';
import { deliverProduct } from '@/lib/delivery';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check local DB first
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { customer: true, product: true, paymentLink: true },
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

    // Processamento da entrega digital caso aprovado
    let delivery = null;
    if (payment.status === 'APPROVED') {
      if (payment.deliveryStatus !== 'DELIVERED') {
        delivery = await deliverProduct(payment.id);
      } else {
        // Já entregue - montar os metadados de entrega para a tela de confirmação
        const product = payment.product;
        const link = payment.paymentLink;
        const customer = payment.customer;
        const customerPhone = customer?.phone?.replace(/\D/g, '') || null;
        const deliveryType = product?.deliveryType || 'ACCESS_LINK';
        const deliveryUrl = link?.deliveryUrl || product?.deliveryUrl || null;
        const deliveryContent = link?.deliveryContent || product?.deliveryContent || null;
        const deliveryInstructions = product?.deliveryInstructions || null;

        let whatsappDirectLink: string | null = null;
        if (customerPhone) {
          const fullPhone = customerPhone.length <= 11 ? `55${customerPhone}` : customerPhone;
          let msg = `Olá, *${customer?.name || 'Cliente'}*! 🎉\n\n`;
          msg += `Seu pagamento foi confirmado com sucesso!\n\n`;
          if (deliveryUrl) msg += `📥 Link de acesso / download: ${deliveryUrl}\n\n`;
          if (deliveryContent) msg += `🔑 Acesso: ${deliveryContent}\n\n`;
          msg += `ID da Transação: #${payment.mpPaymentId || payment.id.slice(0, 8)}`;
          whatsappDirectLink = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(msg)}`;
        }

        delivery = {
          success: true,
          deliveryType,
          deliveryUrl,
          deliveryContent,
          deliveryInstructions,
          whatsappDirectLink,
          emailSent: payment.deliveryChannel?.includes('EMAIL') ?? false,
          whatsappSent: payment.deliveryChannel?.includes('WHATSAPP') ?? false,
        };
      }
    }

    return NextResponse.json({ payment, delivery });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
