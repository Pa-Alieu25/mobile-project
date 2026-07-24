import { apiRequest } from './api';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'ABANDONED';

export type InitializePaymentResult = {
    authorizationUrl: string;
    reference: string;
};

export type VerifyPaymentResult = {
    reference: string;
    status: PaymentStatus;
    amount: number;
    paidAt: string | null;
};

// All Paystack calls go through the backend — the app never talks to
// api.paystack.co directly, and never decides "payment succeeded" on its own;
// that's only ever true when verifyPayment() says so.
export async function initializePayment(
    amountInPesewas: number,
    token: string | null
): Promise<InitializePaymentResult> {
    return apiRequest<InitializePaymentResult>('/payments/initialize', {
        method: 'POST',
        token,
        body: { plan: 'PRO_SEMESTER', amount: amountInPesewas },
    });
}

export async function verifyPayment(reference: string, token: string | null): Promise<VerifyPaymentResult> {
    return apiRequest<VerifyPaymentResult>(`/payments/verify/${encodeURIComponent(reference)}`, { token });
}
