import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const eventType = searchParams.get('eventType');

    const where: any = {};
    if (eventType) where.eventType = eventType;
    if (status === 'processed') where.processed = true;
    if (status === 'error') where.error = { not: null };

    const [logs, total] = await Promise.all([
      prisma.webhookLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.webhookLog.count({ where }),
    ]);

    const formatted = logs.map((log) => {
      let parsedPayload: any = {};
      try {
        parsedPayload = typeof log.payload === 'string' ? JSON.parse(log.payload) : log.payload;
      } catch {
        parsedPayload = log.payload;
      }

      return {
        id: log.id,
        eventType: log.eventType,
        mpId: parsedPayload?.data?.id || parsedPayload?.id || '-',
        status: log.error ? 'error' : log.processed ? 'processed' : 'received',
        payload: parsedPayload,
        error: log.error,
        processedAt: log.createdAt,
        createdAt: log.createdAt,
      };
    });

    return NextResponse.json({
      logs: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

