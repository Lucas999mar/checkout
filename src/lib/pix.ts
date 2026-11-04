import QRCode from 'qrcode';

// ==========================================
// Lista Oficial de Bancos Brasileiros
// ==========================================
export interface BankInfo {
  code: string;
  name: string;
  shortName: string;
  color: string;
  badgeColor: string;
  icon: string;
  deeplinkScheme?: string;
  description: string;
}

export const SUPPORTED_BANKS: Record<string, BankInfo> = {
  mercadopago: {
    code: 'mercadopago',
    name: 'Mercado Pago',
    shortName: 'Mercado Pago',
    color: '#009ee3',
    badgeColor: 'bg-sky-100 text-sky-800',
    icon: '🛡️',
    deeplinkScheme: 'mercadopago://',
    description: 'Processamento automático via API Mercado Pago com confirmação instantânea',
  },
  nubank: {
    code: 'nubank',
    name: 'Nubank (Nu Pagamentos)',
    shortName: 'Nubank',
    color: '#820ad1',
    badgeColor: 'bg-purple-100 text-purple-800',
    icon: '🟣',
    deeplinkScheme: 'nubank://',
    description: 'Link PIX direto para conta Nubank com QR Code e Copia e Cola',
  },
  inter: {
    code: 'inter',
    name: 'Banco Inter',
    shortName: 'Inter',
    color: '#ff7a00',
    badgeColor: 'bg-orange-100 text-orange-800',
    icon: '🟠',
    deeplinkScheme: 'bancointer://',
    description: 'Link PIX direto para conta Banco Inter',
  },
  itau: {
    code: 'itau',
    name: 'Banco Itaú Unibanco',
    shortName: 'Itaú',
    color: '#ec7000',
    badgeColor: 'bg-amber-100 text-amber-800',
    icon: '🟦',
    deeplinkScheme: 'itau://',
    description: 'Link PIX direto para conta Itaú',
  },
  bradesco: {
    code: 'bradesco',
    name: 'Banco Bradesco',
    shortName: 'Bradesco',
    color: '#cc092f',
    badgeColor: 'bg-red-100 text-red-800',
    icon: '🔴',
    deeplinkScheme: 'bradesco://',
    description: 'Link PIX direto para conta Bradesco',
  },
  bb: {
    code: 'bb',
    name: 'Banco do Brasil',
    shortName: 'Banco do Brasil',
    color: '#fcf800',
    badgeColor: 'bg-yellow-100 text-yellow-800',
    icon: '🟡',
    deeplinkScheme: 'bb://',
    description: 'Link PIX direto para conta Banco do Brasil',
  },
  santander: {
    code: 'santander',
    name: 'Banco Santander',
    shortName: 'Santander',
    color: '#ec0000',
    badgeColor: 'bg-rose-100 text-rose-800',
    icon: '🔴',
    deeplinkScheme: 'santander://',
    description: 'Link PIX direto para conta Santander',
  },
  caixa: {
    code: 'caixa',
    name: 'Caixa Econômica Federal',
    shortName: 'Caixa',
    color: '#0066b3',
    badgeColor: 'bg-blue-100 text-blue-800',
    icon: '🔵',
    deeplinkScheme: 'caixa://',
    description: 'Link PIX direto para conta Caixa',
  },
  c6: {
    code: 'c6',
    name: 'C6 Bank',
    shortName: 'C6 Bank',
    color: '#242424',
    badgeColor: 'bg-zinc-100 text-zinc-800',
    icon: '⬛',
    deeplinkScheme: 'c6bank://',
    description: 'Link PIX direto para conta C6 Bank',
  },
  asaas: {
    code: 'asaas',
    name: 'Asaas Pagamentos',
    shortName: 'Asaas',
    color: '#0030b8',
    badgeColor: 'bg-indigo-100 text-indigo-800',
    icon: '⚡',
    description: 'Gateway Asaas para cobranças avulsas e assinaturas',
  },
  efi: {
    code: 'efi',
    name: 'Efí Bank (Gerencianet)',
    shortName: 'Efí Bank',
    color: '#f37021',
    badgeColor: 'bg-emerald-100 text-emerald-800',
    icon: '🟩',
    description: 'Gateway Efí Bank para emissão de PIX com webhook',
  },
  direct_pix: {
    code: 'direct_pix',
    name: 'Chave PIX Direta (Qualquer Banco)',
    shortName: 'PIX Universal',
    color: '#16a34a',
    badgeColor: 'bg-green-100 text-green-800',
    icon: '🟢',
    description: 'Aceito em 100% dos bancos do Brasil (QR Code Padrão BACEN)',
  },
};

// ==========================================
// Cálculo de CRC16-CCITT (Padrão BACEN PIX)
// ==========================================
export function calculateCRC16(payload: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0');
}

// Formatação TLV (Type-Length-Value)
function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

// ==========================================
// Gerador de Payload PIX Padrão BACEN (EMV BR Code)
// ==========================================
export interface BacenPixParams {
  pixKey: string;
  beneficiaryName: string;
  beneficiaryCity?: string;
  amount: number;
  txId?: string;
  description?: string;
}

export function generateBacenPixPayload(params: BacenPixParams): string {
  // Limpeza de campos
  const cleanKey = params.pixKey.trim();
  const cleanName = params.beneficiaryName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .slice(0, 25);
  const cleanCity = (params.beneficiaryCity || 'SAO PAULO')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .slice(0, 15);
  const cleanTxId = (params.txId || '***').replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || '***';
  const formattedAmount = params.amount.toFixed(2);

  // 26: Merchant Account Information
  const gui = tlv('00', 'br.gov.bcb.pix');
  const key = tlv('01', cleanKey);
  const desc = params.description ? tlv('02', params.description.slice(0, 40)) : '';
  const merchantAccountInfo = tlv('26', `${gui}${key}${desc}`);

  // 62: Additional Data Field Template (TXID)
  const txidTlv = tlv('05', cleanTxId);
  const additionalDataField = tlv('62', txidTlv);

  // Montagem do payload sem CRC
  const payloadWithoutCRC =
    tlv('00', '01') + // Payload Format Indicator
    tlv('01', '12') + // Point of Initiation (12 = dinâmico/reutilizável)
    merchantAccountInfo +
    tlv('52', '0000') + // Merchant Category Code
    tlv('53', '986') + // Currency Code (986 = BRL)
    tlv('54', formattedAmount) + // Transaction Amount
    tlv('58', 'BR') + // Country Code
    tlv('59', cleanName) + // Merchant Name
    tlv('60', cleanCity) + // Merchant City
    additionalDataField +
    '6304'; // CRC16 Identifier

  // Calcula e anexa o CRC16
  const crc = calculateCRC16(payloadWithoutCRC);
  return `${payloadWithoutCRC}${crc}`;
}

// ==========================================
// Gerar QR Code PNG Base64
// ==========================================
export async function generateQrCodeBase64(pixPayload: string): Promise<string> {
  const dataUrl = await QRCode.toDataURL(pixPayload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 8,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  // Retorna apenas a string Base64 sem o prefixo data:image/png;base64,
  return dataUrl.replace(/^data:image\/png;base64,/, '');
}

