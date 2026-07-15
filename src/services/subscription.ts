import { deleteItem, getItem, setItem } from './storage';

// Freemium model (PRD §7): every account gets the full app free for its first
// semester; after that, advanced notification features require a Pro
// subscription. Tracked on-device for now — a production build would store the
// tier on the user record and confirm payment via a Paystack webhook.

const TIER_KEY = 'subscriptionTier'; // 'pro' once subscribed
const FREE_START_KEY = 'freeStartDate';
const FREE_PERIOD_DAYS = 120; // roughly one semester
export const PRO_PRICE_GHS = 10;

export type SubscriptionStatus = {
    subscribed: boolean;
    inFreePeriod: boolean;
    daysLeftInFree: number;
    // Whether the user currently has access to Pro features (free period or paid).
    isProActive: boolean;
};

async function getFreeStart(): Promise<number> {
    const raw = await getItem(FREE_START_KEY);
    if (raw) return parseInt(raw, 10);
    const now = Date.now();
    await setItem(FREE_START_KEY, String(now));
    return now;
}

export async function getSubscription(): Promise<SubscriptionStatus> {
    const [tierRaw, freeStart] = await Promise.all([
        getItem(TIER_KEY),
        getFreeStart(),
    ]);
    const subscribed = tierRaw === 'pro';
    const elapsedDays = Math.floor((Date.now() - freeStart) / (1000 * 60 * 60 * 24));
    const daysLeftInFree = Math.max(0, FREE_PERIOD_DAYS - elapsedDays);
    const inFreePeriod = daysLeftInFree > 0;
    return {
        subscribed,
        inFreePeriod,
        daysLeftInFree,
        isProActive: subscribed || inFreePeriod,
    };
}

export async function activatePro(): Promise<void> {
    await setItem(TIER_KEY, 'pro');
}

export async function cancelPro(): Promise<void> {
    await deleteItem(TIER_KEY);
}
