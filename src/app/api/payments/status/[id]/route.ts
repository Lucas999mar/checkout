import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getPaymentStatus } from '@/lib/mercadopago';
import { deliverProduct } from '@/lib/delivery';

function buildDeliveryPayload(payment: any) {
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

  return {
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

async function processPaymentStatus(id: string, confirm: boolean = false) {
  // Check local DB first
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { customer: true, product: true, paymentLink: true },
  });

  if (!payment) {
    return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 });
  }

  // 1. Se já está aprovado, garante entrega e retorna dados completos
  if (payment.status === 'APPROVED') {
    let delivery = null;
    if (payment.deliveryStatus !== 'DELIVERED') {
      try {
        delivery = await deliverProduct(payment.id);
      } catch (err: any) {
        console.error('Erro ao entregar produto:', err.message);
        delivery = buildDeliveryPayload(payment);
      }
    } else {
      delivery = buildDeliveryPayload(payment);
    }
    return NextResponse.json({ payment, delivery });
  }

  // 2. Se é Mercado Pago com ID numérico real (ex: 123456789), consulta status na API do Mercado Pago
  const isNumericMpId = payment.mpPaymentId && /^\d+$/.test(payment.mpPaymentId);
  if (payment.status === 'PENDING' && isNumericMpId) {
    try {
      const mpStatus = await getPaymentStatus(payment.mpPaymentId!);
      if (mpStatus.status === 'approved') {
        const updated = await prisma.payment.update({
          where: { id },
          data: {
            status: 'APPROVED',
            mpStatus: mpStatus.status,
            mpStatusDetail: mpStatus.statusDetail,
            paidAt: mpStatus.dateApproved ? new Date(mpStatus.dateApproved) : new Date(),
          },
          include: { customer: true, product: true, paymentLink: true },
        });

        let delivery = null;
        try {
          delivery = await deliverProduct(updated.id);
        } catch (err: any) {
          delivery = buildDeliveryPayload(updated);
        }
        return NextResponse.json({ payment: updated, delivery });
      }
    } catch (e) {
      // MP API might fail or be test token, continue
    }
  }

  // 3. Confirmação solicitada ("Já realizei o pagamento / Liberar Conteúdo" ou chamada POST)
  if (confirm) {
    const updated = await prisma.payment.update({
      where: { id },
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
      delivery = await deliverProduct(updated.id);
    } catch (err: any) {
      console.error('Erro ao disparar entrega:', err.message);
      delivery = buildDeliveryPayload(updated);
    }

    return NextResponse.json({ payment: updated, delivery });
  }

  // 4. Ainda pendente e sem confirmação
  return NextResponse.json({ payment, delivery: null });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const confirm = request.nextUrl.searchParams.get('confirm') === 'true';
    return await processPaymentStatus(params.id, confirm);
  } catch (error: any) {
    console.error('Erro em GET status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // POST sempre aciona a confirmação imediata
    return await processPaymentStatus(params.id, true);
  } catch (error: any) {
    console.error('Erro em POST status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

