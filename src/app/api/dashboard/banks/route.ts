import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { SUPPORTED_BANKS } from '@/lib/pix';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const dbConfigs = await prisma.bankConfig.findMany();
    const configMap = new Map(dbConfigs.map((c) => [c.code, c]));

    const banks = Object.values(SUPPORTED_BANKS).map((bank) => {
      const custom = configMap.get(bank.code);
      return {
        ...bank,
        active: custom ? custom.active : true,
        isDefault: custom ? custom.isDefault : bank.code === 'mercadopago',
        pixKey: custom?.pixKey || '',
        pixKeyType: custom?.pixKeyType || 'ALEATORIA',
        beneficiary: custom?.beneficiary || '',
        city: custom?.city || 'SAO PAULO',
      };
    });

    return NextResponse.json({ banks });
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
    const { code, pixKey, pixKeyType, beneficiary, city, isDefault } = body;

    if (!code) {
      return NextResponse.json({ error: 'Código do banco é obrigatório' }, { status: 400 });
    }

    const bankMeta = SUPPORTED_BANKS[code];
    if (!bankMeta) {
      return NextResponse.json({ error: 'Banco não suportado' }, { status: 400 });
    }

    if (isDefault) {
      // Unset previous defaults
      await prisma.bankConfig.updateMany({ data: { isDefault: false } });
    }

    const config = await prisma.bankConfig.upsert({
      where: { code },
      update: {
        pixKey: pixKey || null,
        pixKeyType: pixKeyType || 'ALEATORIA',
        beneficiary: beneficiary || null,
        city: city || 'SAO PAULO',
        isDefault: isDefault || false,
      },
      create: {
        code,
        name: bankMeta.name,
        color: bankMeta.color,
        icon: bankMeta.icon,
        pixKey: pixKey || null,
        pixKeyType: pixKeyType || 'ALEATORIA',
        beneficiary: beneficiary || null,
        city: city || 'SAO PAULO',
        isDefault: isDefault || false,
      },
    });

    return NextResponse.json({ config });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

