import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';

/**
 * Normaliza número de telefone para o padrão WhatsApp internacional
 */
function normalizePhone(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.length <= 11) {
    return `55${clean}`;
  }
  return clean;
}

/**
 * GET /api/dashboard/whatsapp
 * Retorna o status da conexão do WhatsApp e o QR Code ativo
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const config = await prisma.deliveryConfig.findFirst();
    if (!config || !config.whatsappApiUrl) {
      return NextResponse.json({
        configured: false,
        status: 'DISCONNECTED',
        provider: 'EVOLUTION',
        phone: null,
        qrCode: null,
      });
    }

    const provider = config.whatsappProvider || 'EVOLUTION';
    const apiUrl = config.whatsappApiUrl.replace(/\/+$/, '');
    const apiKey = config.whatsappApiKey || '';
    const instance = config.whatsappInstance || 'checkout-pro';

    let isConnected = false;
    let qrCodeDataUrl: string | null = null;
    let connectedPhone: string | null = config.whatsappPhone || null;
    let statusText: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' = 'DISCONNECTED';

    // 1. Checagem para Evolution API (v1 / v2)
    if (provider === 'EVOLUTION') {
      try {
        const stateRes = await fetch(`${apiUrl}/instance/connectionState/${instance}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { 'apikey': apiKey, 'Authorization': `Bearer ${apiKey}` } : {}),
          },
          cache: 'no-store',
        });

        if (stateRes.ok) {
          const stateData = await stateRes.json();
          const state = stateData?.instance?.state || stateData?.state;

          if (state === 'open') {
            isConnected = true;
            statusText = 'CONNECTED';
            connectedPhone = stateData?.instance?.ownerJid || stateData?.owner || config.whatsappPhone;
          } else {
            statusText = 'CONNECTING';
            // Buscar QR code
            const qrRes = await fetch(`${apiUrl}/instance/connect/${instance}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                ...(apiKey ? { 'apikey': apiKey, 'Authorization': `Bearer ${apiKey}` } : {}),
              },
              cache: 'no-store',
            });
            if (qrRes.ok) {
              const qrData = await qrRes.json();
              const base64 = qrData.base64 || qrData.qrcode?.base64;
              const code = qrData.code || qrData.qrcode?.code;

              if (base64) {
                qrCodeDataUrl = base64.startsWith('data:image') ? base64 : `data:image/png;base64,${base64}`;
              } else if (code) {
                qrCodeDataUrl = await QRCode.toDataURL(code);
              }
            }
          }
        }
      } catch (err: any) {
        console.warn('Erro ao consultar status Evolution API:', err.message);
      }
    }

    // 2. Checagem para WAHA (WhatsApp HTTP API)
    if (provider === 'WAHA') {
      try {
        const sessionRes = await fetch(`${apiUrl}/api/sessions/${instance}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { 'X-Api-Key': apiKey } : {}),
          },
          cache: 'no-store',
        });

        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          if (sessionData.status === 'WORKING') {
            isConnected = true;
            statusText = 'CONNECTED';
            connectedPhone = sessionData?.me?.id?.split('@')[0] || config.whatsappPhone;
          } else if (sessionData.status === 'SCAN_QR_CODE' || sessionData.status === 'STARTING') {
            statusText = 'CONNECTING';
            // Buscar QR Code no WAHA
            const qrRes = await fetch(`${apiUrl}/api/${instance}/auth/qr`, {
              method: 'GET',
              headers: {
                ...(apiKey ? { 'X-Api-Key': apiKey } : {}),
              },
              cache: 'no-store',
            });
            if (qrRes.ok) {
              const contentType = qrRes.headers.get('content-type') || '';
              if (contentType.includes('image')) {
                const arrayBuf = await qrRes.arrayBuffer();
                const b64 = Buffer.from(arrayBuf).toString('base64');
                qrCodeDataUrl = `data:image/png;base64,${b64}`;
              } else {
                const qrJson = await qrRes.json();
                if (qrJson.raw) {
                  qrCodeDataUrl = await QRCode.toDataURL(qrJson.raw);
                }
              }
            }
          }
        }
      } catch (err: any) {
        console.warn('Erro ao consultar status WAHA:', err.message);
      }
    }

    // Atualizar no banco se houve mudança de status
    if (statusText !== config.whatsappStatus || (connectedPhone && connectedPhone !== config.whatsappPhone)) {
      await prisma.deliveryConfig.update({
        where: { id: config.id },
        data: {
          whatsappStatus: statusText,
          whatsappPhone: connectedPhone,
        },
      });
    }

    return NextResponse.json({
      configured: true,
      provider,
      instance,
      apiUrl: config.whatsappApiUrl,
      apiKey: config.whatsappApiKey,
      status: statusText,
      connected: isConnected,
      phone: connectedPhone,
      qrCode: qrCodeDataUrl,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/dashboard/whatsapp
 * Ações: connect (cria/busca QR Code), disconnect (desconecta), test (envia mensagem)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { action, provider = 'EVOLUTION', apiUrl, apiKey, instance = 'checkout-pro', testNumber } = body;

    let config = await prisma.deliveryConfig.findFirst();
    if (!config) {
      config = await prisma.deliveryConfig.create({
        data: {
          emailSenderName: 'Checkout Pro',
          emailSenderAddress: 'onboarding@resend.dev',
          whatsappProvider: provider,
          whatsappInstance: instance,
        },
      });
    }

    const cleanApiUrl = (apiUrl || config.whatsappApiUrl || '').replace(/\/+$/, '');
    const cleanApiKey = apiKey !== undefined ? apiKey : (config.whatsappApiKey || '');
    const cleanInstance = instance || config.whatsappInstance || 'checkout-pro';

    // ── AÇÃO: DESCONECTAR ──────────────────────────────────────────
    if (action === 'disconnect') {
      try {
        if (provider === 'EVOLUTION') {
          await fetch(`${cleanApiUrl}/instance/logout/${cleanInstance}`, {
            method: 'DELETE',
            headers: {
              ...(cleanApiKey ? { 'apikey': cleanApiKey, 'Authorization': `Bearer ${cleanApiKey}` } : {}),
            },
          });
        } else if (provider === 'WAHA') {
          await fetch(`${cleanApiUrl}/api/sessions/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(cleanApiKey ? { 'X-Api-Key': cleanApiKey } : {}),
            },
            body: JSON.stringify({ name: cleanInstance }),
          });
        }
      } catch (e) {}

      await prisma.deliveryConfig.update({
        where: { id: config.id },
        data: {
          whatsappStatus: 'DISCONNECTED',
          whatsappPhone: null,
          whatsappQrCode: null,
        },
      });

      return NextResponse.json({ success: true, message: 'WhatsApp desconectado com sucesso' });
    }

    // ── AÇÃO: CONECTAR E GERAR QR CODE ─────────────────────────────
    if (action === 'connect') {
      if (!cleanApiUrl) {
        return NextResponse.json({ error: 'A URL do servidor WhatsApp é obrigatória' }, { status: 400 });
      }

      // Salva no banco as credenciais do provedor
      await prisma.deliveryConfig.update({
        where: { id: config.id },
        data: {
          whatsappProvider: provider,
          whatsappApiUrl: cleanApiUrl,
          whatsappApiKey: cleanApiKey,
          whatsappInstance: cleanInstance,
          whatsappStatus: 'CONNECTING',
        },
      });

      let qrCodeDataUrl: string | null = null;
      let alreadyConnected = false;

      // 1. Iniciar / Conectar Evolution API
      if (provider === 'EVOLUTION') {
        // Tenta criar ou buscar a instância
        try {
          const createRes = await fetch(`${cleanApiUrl}/instance/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(cleanApiKey ? { 'apikey': cleanApiKey, 'Authorization': `Bearer ${cleanApiKey}` } : {}),
            },
            body: JSON.stringify({
              instanceName: cleanInstance,
              qrcode: true,
              integration: 'WHATSAPP-BAILEYS',
            }),
          });
          const createData = await createRes.json();
          if (createData.qrcode?.base64) {
            qrCodeDataUrl = createData.qrcode.base64;
          } else if (createData.qrcode?.code) {
            qrCodeDataUrl = await QRCode.toDataURL(createData.qrcode.code);
          }
        } catch (e) {}

        // Se não veio no create, busca no /instance/connect
        if (!qrCodeDataUrl) {
          try {
            const connectRes = await fetch(`${cleanApiUrl}/instance/connect/${cleanInstance}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                ...(cleanApiKey ? { 'apikey': cleanApiKey, 'Authorization': `Bearer ${cleanApiKey}` } : {}),
              },
            });
            if (connectRes.ok) {
              const connData = await connectRes.json();
              if (connData.base64) {
                qrCodeDataUrl = connData.base64.startsWith('data:image') ? connData.base64 : `data:image/png;base64,${connData.base64}`;
              } else if (connData.code) {
                qrCodeDataUrl = await QRCode.toDataURL(connData.code);
              }
            }
          } catch (e) {}
        }
      }

      // 2. Iniciar / Conectar WAHA
      if (provider === 'WAHA') {
        try {
          // Inicia sessão
          await fetch(`${cleanApiUrl}/api/sessions/start`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(cleanApiKey ? { 'X-Api-Key': cleanApiKey } : {}),
            },
            body: JSON.stringify({ name: cleanInstance }),
          });

          // Pega QR code
          const qrRes = await fetch(`${cleanApiUrl}/api/${cleanInstance}/auth/qr`, {
            method: 'GET',
            headers: {
              ...(cleanApiKey ? { 'X-Api-Key': cleanApiKey } : {}),
            },
          });
          if (qrRes.ok) {
            const contentType = qrRes.headers.get('content-type') || '';
            if (contentType.includes('image')) {
              const arrayBuf = await qrRes.arrayBuffer();
              const b64 = Buffer.from(arrayBuf).toString('base64');
              qrCodeDataUrl = `data:image/png;base64,${b64}`;
            } else {
              const qrJson = await qrRes.json();
              if (qrJson.raw) {
                qrCodeDataUrl = await QRCode.toDataURL(qrJson.raw);
              }
            }
          }
        } catch (e) {}
      }

      return NextResponse.json({
        success: true,
        qrCode: qrCodeDataUrl,
        provider,
        instance: cleanInstance,
        message: qrCodeDataUrl ? 'QR Code gerado com sucesso' : 'Instância iniciada. Aguarde o QR Code.',
      });
    }

    // ── AÇÃO: TESTAR ENVIO DE MENSAGEM ─────────────────────────────
    if (action === 'test') {
      if (!testNumber) {
        return NextResponse.json({ error: 'Informe um número para envio de teste' }, { status: 400 });
      }

      const fullPhone = normalizePhone(testNumber);
      const testMsg = `🎉 *Parabéns!* Seu WhatsApp está conectado com sucesso ao *Checkout Pro*!\n\nA partir de agora, toda compra aprovada de PDF, vídeo, documento ou curso terá seu conteúdo entregue automaticamente por este número. 🚀`;

      let sent = false;
      let errorMsg = '';

      if (provider === 'EVOLUTION') {
        const evoRes = await fetch(`${cleanApiUrl}/message/sendText/${cleanInstance}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(cleanApiKey ? { 'apikey': cleanApiKey, 'Authorization': `Bearer ${cleanApiKey}` } : {}),
          },
          body: JSON.stringify({
            number: fullPhone,
            text: testMsg,
          }),
        });
        if (evoRes.ok) {
          sent = true;
        } else {
          errorMsg = await evoRes.text();
        }
      } else if (provider === 'WAHA') {
        const wahaRes = await fetch(`${cleanApiUrl}/api/sendText`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(cleanApiKey ? { 'X-Api-Key': cleanApiKey } : {}),
          },
          body: JSON.stringify({
            session: cleanInstance,
            chatId: `${fullPhone}@c.us`,
            text: testMsg,
          }),
        });
        if (wahaRes.ok) {
          sent = true;
        } else {
          errorMsg = await wahaRes.text();
        }
      }

      if (!sent) {
        return NextResponse.json({ error: `Erro no envio: ${errorMsg || 'Falha na resposta do servidor'}` }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Mensagem de teste enviada com sucesso!' });
    }

    return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
