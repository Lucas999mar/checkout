import prisma from '@/lib/prisma';

export interface DeliveryResult {
  success: boolean;
  deliveryType: string;
  deliveryUrl?: string | null;
  deliveryContent?: string | null;
  deliveryInstructions?: string | null;
  whatsappDirectLink?: string | null;
  emailSent: boolean;
  whatsappSent: boolean;
  error?: string | null;
}

/**
 * Dispara e entrega automaticamente o infoproduto (PDF, Documento, Vídeo, Curso, Chave)
 * para o e-mail e WhatsApp do cliente assim que o pagamento é aprovado.
 */
export async function deliverProduct(paymentId: string): Promise<DeliveryResult> {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        customer: true,
        product: true,
        paymentLink: true,
      },
    });

    if (!payment) {
      throw new Error(`Pagamento ${paymentId} não encontrado.`);
    }

    const { customer, product, paymentLink } = payment;

    // Se o pagamento não estiver aprovado, não entrega
    if (payment.status !== 'APPROVED') {
      return {
        success: false,
        deliveryType: 'NONE',
        emailSent: false,
        whatsappSent: false,
        error: 'Pagamento ainda não aprovado.',
      };
    }

    // Identificar dados de entrega (preferência: link de pagamento > produto)
    const deliveryType = product?.deliveryType || 'ACCESS_LINK';
    const deliveryUrl = paymentLink?.deliveryUrl || product?.deliveryUrl || null;
    const deliveryContent = paymentLink?.deliveryContent || product?.deliveryContent || null;
    const deliveryInstructions = product?.deliveryInstructions || null;
    const notifyEmail = product?.notifyEmail ?? true;
    const notifyWhatsapp = product?.notifyWhatsapp ?? true;

    const customerName = customer?.name || 'Cliente';
    const customerEmail = customer?.email;
    const customerPhone = customer?.phone?.replace(/\D/g, '') || null;
    const productName = product?.name || paymentLink?.title || 'Seu Produto Digital';
    const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.amount);

    // Carregar configurações do sistema de envio
    const config = await prisma.deliveryConfig.findFirst();

    // 1. Montar Mensagem do WhatsApp
    let whatsappMessage = `Olá, *${customerName}*! 🎉\n\n`;
    whatsappMessage += `Seu pagamento de *${formattedAmount}* referente ao produto *${productName}* foi confirmado com sucesso!\n\n`;

    if (deliveryUrl) {
      if (deliveryType === 'DOWNLOAD') {
        whatsappMessage += `📥 *Acesse ou baixe seu arquivo pelo link:*\n${deliveryUrl}\n\n`;
      } else if (deliveryType === 'VIDEO') {
        whatsappMessage += `🎬 *Assista ao vídeo / acesse o conteúdo no link:*\n${deliveryUrl}\n\n`;
      } else {
        whatsappMessage += `👉 *Acesse seu curso / área de membros pelo link:*\n${deliveryUrl}\n\n`;
      }
    }

    if (deliveryContent) {
      whatsappMessage += `🔑 *Chave de Acesso / Detalhes:*\n${deliveryContent}\n\n`;
    }

    if (deliveryInstructions) {
      whatsappMessage += `ℹ️ *Instruções:*\n${deliveryInstructions}\n\n`;
    }

    whatsappMessage += `ID da Transação: #${payment.mpPaymentId || payment.id.slice(0, 8)}\n`;
    whatsappMessage += `Agradecemos pela preferência! Caso precise de suporte, estamos à disposição.`;

    // Gerar link direto do WhatsApp (wa.me)
    let whatsappDirectLink: string | null = null;
    if (customerPhone) {
      const fullPhone = customerPhone.length <= 11 ? `55${customerPhone}` : customerPhone;
      whatsappDirectLink = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(whatsappMessage)}`;
    }

    let whatsappSent = false;
    let emailSent = false;

    // 2. Disparo Automático via WhatsApp Gateway (se configurado)
    if (notifyWhatsapp && customerPhone && config?.whatsappApiUrl) {
      try {
        const fullPhone = customerPhone.length <= 11 ? `55${customerPhone}` : customerPhone;
        const provider = config.whatsappProvider || 'EVOLUTION';
        const cleanUrl = config.whatsappApiUrl.replace(/\/+$/, '');
        const instance = config.whatsappInstance || 'checkout-pro';
        const apiKey = config.whatsappApiKey || '';

        let targetUrl = config.whatsappApiUrl;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        let bodyPayload: any = {};

        if (provider === 'EVOLUTION') {
          targetUrl = cleanUrl.includes('/message/sendText') ? cleanUrl : `${cleanUrl}/message/sendText/${instance}`;
          if (apiKey) {
            headers['apikey'] = apiKey;
            headers['Authorization'] = `Bearer ${apiKey}`;
          }
          bodyPayload = {
            number: fullPhone,
            text: whatsappMessage,
            textMessage: { text: whatsappMessage },
          };
        } else if (provider === 'WAHA') {
          targetUrl = cleanUrl.includes('/api/sendText') ? cleanUrl : `${cleanUrl}/api/sendText`;
          if (apiKey) {
            headers['X-Api-Key'] = apiKey;
          }
          bodyPayload = {
            session: instance,
            chatId: `${fullPhone}@c.us`,
            text: whatsappMessage,
          };
        } else {
          // Custom / webhook
          if (apiKey) {
            headers['apikey'] = apiKey;
            headers['Authorization'] = `Bearer ${apiKey}`;
          }
          bodyPayload = {
            number: fullPhone,
            phone: fullPhone,
            message: whatsappMessage,
            text: whatsappMessage,
            instance,
          };
        }

        const res = await fetch(targetUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(bodyPayload),
        });

        if (res.ok) {
          whatsappSent = true;
          await prisma.deliveryLog.create({
            data: {
              paymentId: payment.id,
              customerEmail,
              customerPhone,
              productName,
              channel: 'WHATSAPP',
              status: 'SUCCESS',
              detail: `Mensagem entregue via ${provider} para ${fullPhone}`,
            },
          });
        } else {
          const errDetail = await res.text();
          await prisma.deliveryLog.create({
            data: {
              paymentId: payment.id,
              customerEmail,
              customerPhone,
              productName,
              channel: 'WHATSAPP',
              status: 'FAILED',
              detail: `Status ${res.status}: ${errDetail.slice(0, 200)}`,
            },
          });
        }
      } catch (waError: any) {
        console.warn('Erro ao disparar WhatsApp automático:', waError.message);
        await prisma.deliveryLog.create({
          data: {
            paymentId: payment.id,
            customerEmail,
            customerPhone,
            productName,
            channel: 'WHATSAPP',
            status: 'FAILED',
            detail: waError.message,
          },
        });
      }
    }

    // 3. Disparo Automático via E-mail
    if (notifyEmail && customerEmail) {
      try {
        const htmlEmail = generateDeliveryEmailHtml({
          customerName,
          productName,
          amount: formattedAmount,
          transactionId: payment.mpPaymentId || payment.id,
          deliveryType,
          deliveryUrl,
          deliveryContent,
          deliveryInstructions,
          senderName: config?.emailSenderName || 'Checkout Pro',
        });

        // Se tiver chave Resend configurada
        const resendKey = config?.resendApiKey || process.env.RESEND_API_KEY;
        if (resendKey) {
          const resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${resendKey}`,
            },
            body: JSON.stringify({
              from: `${config?.emailSenderName || 'Checkout Pro'} <${config?.emailSenderAddress || 'onboarding@resend.dev'}>`,
              to: [customerEmail],
              subject: `🎉 Seu produto está pronto: ${productName}`,
              html: htmlEmail,
            }),
          });
          if (resendRes.ok) {
            emailSent = true;
          }
        }

        await prisma.deliveryLog.create({
          data: {
            paymentId: payment.id,
            customerEmail,
            customerPhone,
            productName,
            channel: 'EMAIL',
            status: emailSent ? 'SUCCESS' : 'LOGGED',
            detail: emailSent ? 'Email enviado via Resend' : 'Email gerado e registrado no sistema',
          },
        });
      } catch (mailError: any) {
        console.warn('Erro ao disparar email automático:', mailError.message);
      }
    }

    // 4. Atualizar status de entrega no pagamento
    const channelsUsed = [];
    if (emailSent) channelsUsed.push('EMAIL');
    if (whatsappSent) channelsUsed.push('WHATSAPP');
    if (!channelsUsed.length) channelsUsed.push('DIRECT_ACCESS');

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        deliveredAt: new Date(),
        deliveryStatus: 'DELIVERED',
        deliveryChannel: channelsUsed.join('_AND_'),
      },
    });

    return {
      success: true,
      deliveryType,
      deliveryUrl,
      deliveryContent,
      deliveryInstructions,
      whatsappDirectLink,
      emailSent,
      whatsappSent,
    };
  } catch (error: any) {
    console.error('Erro na entrega automática do produto:', error);
    return {
      success: false,
      deliveryType: 'NONE',
      emailSent: false,
      whatsappSent: false,
      error: error.message,
    };
  }
}

/**
 * Template HTML responsivo de entrega de infoproduto / conteúdo digital
 */
function generateDeliveryEmailHtml(params: {
  customerName: string;
  productName: string;
  amount: string;
  transactionId: string;
  deliveryType: string;
  deliveryUrl: string | null;
  deliveryContent: string | null;
  deliveryInstructions: string | null;
  senderName: string;
}): string {
  const {
    customerName,
    productName,
    amount,
    transactionId,
    deliveryType,
    deliveryUrl,
    deliveryContent,
    deliveryInstructions,
    senderName,
  } = params;

  let actionButtonText = 'Acessar Meu Conteúdo';
  let badgeText = 'Acesso Liberado';

  if (deliveryType === 'DOWNLOAD') {
    actionButtonText = '📥 Baixar Arquivo / PDF Agora';
    badgeText = 'Download Pronto';
  } else if (deliveryType === 'VIDEO') {
    actionButtonText = '🎬 Assistir Vídeo / Acessar Aulas';
    badgeText = 'Acesso ao Vídeo';
  } else if (deliveryType === 'ACCESS_LINK') {
    actionButtonText = '🎓 Acessar Área de Membros';
    badgeText = 'Acesso ao Curso';
  }

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Entrega do seu Produto - ${productName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 36px 30px; text-align: center;">
              <span style="display: inline-block; background-color: rgba(255,255,255,0.2); color: #ffffff; padding: 6px 16px; border-radius: 999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
                ${badgeText}
              </span>
              <h1 style="color: #ffffff; font-size: 26px; font-weight: 800; margin: 0;">Pagamento Confirmado! 🎉</h1>
              <p style="color: #bfdbfe; font-size: 14px; margin: 8px 0 0;">Obrigado pela sua compra. Seu acesso foi liberado com sucesso.</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px 30px;">
              <p style="font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
                Olá, <strong>${customerName}</strong>!
              </p>
              <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 24px;">
                Seu pagamento de <strong>${amount}</strong> referente ao produto <strong>${productName}</strong> foi aprovado instantaneamente.
              </p>

              <!-- Delivery Action Box -->
              ${
                deliveryUrl
                  ? `
              <div style="text-align: center; margin: 32px 0;">
                <a href="${deliveryUrl}" target="_blank" style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 8px rgba(22, 163, 74, 0.3);">
                  ${actionButtonText}
                </a>
                <p style="font-size: 12px; color: #94a3b8; margin-top: 10px;">Link direto: <a href="${deliveryUrl}" style="color: #2563eb;">${deliveryUrl}</a></p>
              </div>
              `
                  : ''
              }

              <!-- Custom Content / Keys -->
              ${
                deliveryContent
                  ? `
              <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <p style="font-size: 13px; font-weight: 700; color: #334155; margin: 0 0 8px; text-transform: uppercase;">
                  🔑 Seus Dados de Acesso / Chave:
                </p>
                <div style="background-color: #ffffff; border: 1px dashed #94a3b8; border-radius: 8px; padding: 12px; font-family: monospace; font-size: 14px; color: #0f172a; word-break: break-all;">
                  ${deliveryContent.replace(/\n/g, '<br>')}
                </div>
              </div>
              `
                  : ''
              }

              <!-- Instructions -->
              ${
                deliveryInstructions
                  ? `
              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 18px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <p style="font-size: 13px; font-weight: 700; color: #1e40af; margin: 0 0 4px;">Instruções:</p>
                <p style="font-size: 13px; color: #1e3a8a; margin: 0; line-height: 1.5;">${deliveryInstructions.replace(/\n/g, '<br>')}</p>
              </div>
              `
                  : ''
              }

              <!-- Receipt Details -->
              <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 30px;">
                <table width="100%" style="font-size: 12px; color: #64748b;">
                  <tr>
                    <td><strong>ID da Transação:</strong> #${transactionId}</td>
                    <td align="right"><strong>Produto:</strong> ${productName}</td>
                  </tr>
                </table>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 30px; text-align: center; font-size: 12px; color: #94a3b8;">
              <p style="margin: 0 0 4px;">Este email foi enviado automaticamente por <strong>${senderName}</strong>.</p>
              <p style="margin: 0;">Guarde este email como comprovante de acesso ao seu produto digital.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

