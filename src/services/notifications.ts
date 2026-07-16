import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiRequest } from './api';
import { getItem, setItem } from './storage';

// Local (on-device) reminders. This works in Expo Go — remote push would need
// an EAS development build, which is a separate step.

export const CLASS_REMINDERS_ENABLED_KEY = 'classRemindersEnabled';
const ANDROID_CHANNEL_ID = 'class-reminders';
const DEFAULT_MINUTES_BEFORE = 30;

// Show the notification even when the app is foregrounded.
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export type ReminderClass = {
    id: number;
    courseCode: string;
    courseTitle: string;
    startTime: string;
    venue: string;
    dayOfWeek: string;
    status: string;
};

// Ensures the Android channel exists and permission is granted. Returns whether
// notifications are allowed.
export async function ensureNotificationPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
            name: 'Class reminders',
            importance: Notifications.AndroidImportance.HIGH,
        });
    }

    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;

    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
}

// Parses "8:00 AM" / "2:30 PM" into a Date set for today.
function classTimeToday(startTime: string): Date | null {
    const match = startTime.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3]?.toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
}

// Clears existing reminders and schedules a notification `minutesBefore` each of
// today's remaining (non-cancelled) classes. Returns how many were scheduled.
export async function syncClassReminders(
    classes: ReminderClass[],
    minutesBefore: number = DEFAULT_MINUTES_BEFORE
): Promise<number> {
    await Notifications.cancelAllScheduledNotificationsAsync();

    const now = Date.now();
    let scheduled = 0;

    for (const item of classes) {
        if (item.status === 'cancelled') continue;
        const start = classTimeToday(item.startTime);
        if (!start) continue;

        const fireAt = start.getTime() - minutesBefore * 60 * 1000;
        if (fireAt <= now) continue; // already started or too soon to remind

        await Notifications.scheduleNotificationAsync({
            content: {
                title: `${item.courseCode} starts in ${minutesBefore} min`,
                body: `${item.courseTitle} · ${item.startTime} · ${item.venue}`,
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: new Date(fireAt),
                channelId: Platform.OS === 'android' ? ANDROID_CHANNEL_ID : undefined,
            },
        });
        scheduled += 1;
    }

    return scheduled;
}

export async function cancelAllReminders(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
}

// Registers this device's Expo push token with the backend so it can receive
// remote push (announcements, cancellations, score releases). This is a no-op
// in Expo Go / without a development build, where getExpoPushTokenAsync is not
// available — it fails quietly and the app keeps working.
export async function registerForPushNotifications(authToken: string | null): Promise<void> {
    try {
        const granted = await ensureNotificationPermissions();
        if (!granted) return;

        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        if (!projectId) return;

        const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
        await apiRequest('/notifications/register-token', {
            method: 'POST',
            token: authToken,
            body: { token: expoPushToken },
        });
    } catch {
        // Expected in Expo Go or before the dev build / FCM is set up — ignore.
    }
}

// True only when the user has enabled class reminders AND granted permission.
// Used by screens to decide whether to (re)schedule without prompting.
export async function classRemindersActive(): Promise<boolean> {
    if ((await getItem(CLASS_REMINDERS_ENABLED_KEY)) === 'false') return false;
    const perms = await Notifications.getPermissionsAsync();
    return perms.granted;
}

const SEEN_SCORE_IDS_KEY = 'seenScoreIds';

export type ScoreNotice = { id: number; courseCode: string };

// Fires a personal local notification for any midsem score the student hasn't
// seen yet, then records them as seen so they are not alerted twice. Only
// notifies when permission is already granted (never prompts here). This is the
// on-device stand-in for the personalized push alert until remote push is set up.
export async function notifyNewScores(scores: ScoreNotice[]): Promise<void> {
    const raw = await getItem(SEEN_SCORE_IDS_KEY);
    let seen: number[] = [];
    if (raw) {
        try {
            seen = JSON.parse(raw);
        } catch {
            // ignore malformed cache
        }
    }
    const seenSet = new Set(seen);
    const fresh = scores.filter((s) => !seenSet.has(s.id));
    if (fresh.length === 0) return;

    const perms = await Notifications.getPermissionsAsync();
    if (perms.granted) {
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
                name: 'Class reminders',
                importance: Notifications.AndroidImportance.HIGH,
            });
        }
        for (const s of fresh) {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: 'Midsem score available',
                    body: `Your ${s.courseCode} midsem score has been posted.`,
                },
                trigger: null, // present immediately
            });
        }
    }

    const allIds = scores.map((s) => s.id);
    await setItem(SEEN_SCORE_IDS_KEY, JSON.stringify([...new Set([...seen, ...allIds])]));
}

const ALERTED_CANCELLED_KEY = 'alertedCancelledClassIds';

export type CancelledClassNotice = { id: number; courseCode: string; dayOfWeek: string };

// Fires a local notification for any newly-cancelled class the student hasn't
// been alerted about yet. Same on-device approach as scores: only when
// permission is already granted, and each cancellation alerts once.
export async function notifyCancelledClasses(cancelled: CancelledClassNotice[]): Promise<void> {
    const raw = await getItem(ALERTED_CANCELLED_KEY);
    let alerted: number[] = [];
    if (raw) {
        try {
            alerted = JSON.parse(raw);
        } catch {
            // ignore malformed cache
        }
    }
    const alertedSet = new Set(alerted);
    const fresh = cancelled.filter((c) => !alertedSet.has(c.id));
    if (fresh.length === 0) return;

    const perms = await Notifications.getPermissionsAsync();
    if (perms.granted) {
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
                name: 'Class reminders',
                importance: Notifications.AndroidImportance.HIGH,
            });
        }
        for (const c of fresh) {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: 'Class cancelled',
                    body: `${c.courseCode} (${c.dayOfWeek}) has been cancelled.`,
                },
                trigger: null, // present immediately
            });
        }
    }

    await setItem(
        ALERTED_CANCELLED_KEY,
        JSON.stringify([...new Set([...alerted, ...cancelled.map((c) => c.id)])])
    );
}
