// Paystack configuration.
//
// TEST MODE: put your Paystack *test* public key (starts with `pk_test_`) in an
// env var so it is not committed:
//
//   EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
//
// In test mode you pay with Paystack's test cards / test Mobile Money — no real
// money moves. For production, swap in your live key (`pk_live_...`) AND verify
// each transaction server-side via a Paystack webhook before granting Pro.

const PLACEHOLDER = 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

export const PAYSTACK_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY ?? PLACEHOLDER;

export const PAYSTACK_TEST_MODE = PAYSTACK_PUBLIC_KEY.startsWith('pk_test_');

// True once a real key (not the placeholder) has been provided.
export const isPaystackConfigured =
    PAYSTACK_PUBLIC_KEY.startsWith('pk_') && !PAYSTACK_PUBLIC_KEY.includes('xxxx');
