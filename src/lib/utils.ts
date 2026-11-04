export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    APPROVED: 'bg-green-100 text-green-800',
    approved: 'bg-green-100 text-green-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    pending: 'bg-yellow-100 text-yellow-800',
    REJECTED: 'bg-red-100 text-red-800',
    rejected: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-gray-100 text-gray-800',
    REFUNDED: 'bg-purple-100 text-purple-800',
    refunded: 'bg-purple-100 text-purple-800',
    IN_PROCESS: 'bg-blue-100 text-blue-800',
    in_process: 'bg-blue-100 text-blue-800',
    EXPIRED: 'bg-gray-100 text-gray-500',
    expired: 'bg-gray-100 text-gray-500',
    AUTHORIZED: 'bg-green-100 text-green-800',
    authorized: 'bg-green-100 text-green-800',
    PAUSED: 'bg-orange-100 text-orange-800',
    paused: 'bg-orange-100 text-orange-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    APPROVED: 'Aprovado',
    approved: 'Aprovado',
    PENDING: 'Pendente',
    pending: 'Pendente',
    REJECTED: 'Rejeitado',
    rejected: 'Rejeitado',
    CANCELLED: 'Cancelado',
    cancelled: 'Cancelado',
    REFUNDED: 'Reembolsado',
    refunded: 'Reembolsado',
    IN_PROCESS: 'Em Processo',
    in_process: 'Em Processo',
    EXPIRED: 'Expirado',
    expired: 'Expirado',
    AUTHORIZED: 'Autorizado',
    authorized: 'Autorizado',
    PAUSED: 'Pausado',
    paused: 'Pausado',
    ONE_TIME: 'Único',
    RECURRING: 'Recorrente',
  };
  return labels[status] || status;
}

export function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    pix: 'PIX',
    visa: 'Visa',
    master: 'Mastercard',
    amex: 'American Express',
    elo: 'Elo',
    hipercard: 'Hipercard',
    bolbradesco: 'Boleto Bradesco',
    pec: 'Pagamento na Lotérica',
    account_money: 'Saldo Mercado Pago',
  };
  return labels[method] || method;
}

export function getPaymentMethodIcon(method: string): string {
  const icons: Record<string, string> = {
    pix: '🟢',
    visa: '💳',
    master: '💳',
    amex: '💳',
    elo: '💳',
    hipercard: '💳',
    bolbradesco: '📄',
    pec: '🏪',
    account_money: '💰',
  };
  return icons[method] || '💳';
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
