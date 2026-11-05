import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await prisma.deliveryConfig.findFirst();
    if (!config || !config.whatsappApiUrl) {
      return NextResponse.json({ status: 'no_whatsapp_configured' });
    }

    const cleanUrl = config.whatsappApiUrl.replace(/\/+$/, '');
    const instance = config.whatsappInstance || 'checkout-pro';
    const apiKey = config.whatsappApiKey || '';
    const provider = config.whatsappProvider || 'EVOLUTION';

    let pingUrl = `${cleanUrl}/instance/connectionState/${instance}`;
    let headers: Record<string, string> = {};

    if (provider === 'EVOLUTION') {
      pingUrl = `${cleanUrl}/instance/connectionState/${instance}`;
      if (apiKey) {
        headers['apikey'] = apiKey;
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
    } else if (provider === 'WAHA') {
      pingUrl = `${cleanUrl}/api/sessions/${instance}`;
      if (apiKey) {
        headers['X-Api-Key'] = apiKey;
      }
    }

    const pingRes = await fetch(pingUrl, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    const isOk = pingRes.ok;
    let state = 'unknown';

    if (isOk) {
      try {
        const data = await pingRes.json();
        state = data?.instance?.state || data?.state || data?.status || 'active';
      } catch (e) {}
    }

    return NextResponse.json({
      status: 'pinged',
      provider,
      url: cleanUrl,
      httpStatus: pingRes.status,
      sessionState: state,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.warn('Keep-alive ping error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

