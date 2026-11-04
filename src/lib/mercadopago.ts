import { MercadoPagoConfig, Payment, Preference, PreApproval, PreApprovalPlan } from 'mercadopago';

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

export const mpPayment = new Payment(client);
export const mpPreference = new Preference(client);
export const mpPreApproval = new PreApproval(client);
export const mpPreApprovalPlan = new PreApprovalPlan(client);

export { client as mpClient };

// ================================================
// PIX Payment Creation
// ================================================
export async function createPixPayment(data: {
  amount: number;
  description: string;
  payerEmail: string;
  payerFirstName: string;
  payerLastName: string;
  payerCpf: string;
  externalReference?: string;
}) {
  const result = await mpPayment.create({
    body: {
      transaction_amount: data.amount,
      description: data.description,
      payment_method_id: 'pix',
      payer: {
        email: data.payerEmail,
        first_name: data.payerFirstName,
        last_name: data.payerLastName,
        identification: {
          type: 'CPF',
          number: data.payerCpf,
        },
      },
      external_reference: data.externalReference,
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
    },
  });

  return {
    paymentId: result.id?.toString(),
    status: result.status,
    qrCode: result.point_of_interaction?.transaction_data?.qr_code,
    qrCodeBase64: result.point_of_interaction?.transaction_data?.qr_code_base64,
    ticketUrl: result.point_of_interaction?.transaction_data?.ticket_url,
    expirationDate: result.date_of_expiration,
  };
}

// ================================================
// Card Payment via Checkout Pro (Preference)
// ================================================
export async function createCheckoutPreference(data: {
  title: string;
  description: string;
  amount: number;
  quantity?: number;
  payerEmail: string;
  externalReference?: string;
  excludedPaymentMethods?: string[];
}) {
  const result = await mpPreference.create({
    body: {
      items: [
        {
          id: data.externalReference || 'item-1',
          title: data.title,
          description: data.description,
          quantity: data.quantity || 1,
          unit_price: data.amount,
          currency_id: 'BRL',
        },
      ],
      payer: {
        email: data.payerEmail,
      },
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success`,
        failure: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/failure`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/pending`,
      },
      auto_return: 'approved',
      external_reference: data.externalReference,
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
      payment_methods: data.excludedPaymentMethods?.length
        ? {
            excluded_payment_methods: data.excludedPaymentMethods.map((id) => ({ id })),
          }
        : undefined,
    },
  });

  return {
    preferenceId: result.id,
    initPoint: result.init_point,
    sandboxInitPoint: result.sandbox_init_point,
  };
}

// ================================================
// Subscription (Recurring) Creation
// ================================================
export async function createSubscription(data: {
  reason: string;
  amount: number;
  payerEmail: string;
  frequency?: number;
  frequencyType?: 'months' | 'days';
  trialDays?: number;
  externalReference?: string;
}) {
  const result = await mpPreApproval.create({
    body: {
      reason: data.reason,
      auto_recurring: {
        frequency: data.frequency || 1,
        frequency_type: data.frequencyType || 'months',
        transaction_amount: data.amount,
        currency_id: 'BRL',
      },
      back_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/subscription-success`,
      payer_email: data.payerEmail,
      external_reference: data.externalReference,
      status: 'pending',
    },
  });

  return {
    subscriptionId: result.id,
    initPoint: result.init_point,
    status: result.status,
  };
}

// ================================================
// Get Payment Status
// ================================================
export async function getPaymentStatus(paymentId: string) {
  const result = await mpPayment.get({ id: paymentId });
  return {
    id: result.id?.toString(),
    status: result.status,
    statusDetail: result.status_detail,
    paymentMethodId: result.payment_method_id,
    paymentTypeId: result.payment_type_id,
    transactionAmount: result.transaction_amount,
    dateApproved: result.date_approved,
  };
}
