import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiRequest } from './api';
import { getItem } from './storage';

// Local (on-device) reminders. This works in development/production builds —
// remote push would need an EAS development build, which is a separate step.

export const CLASS_REMINDERS_ENABLED_KEY = 'classRemindersEnabled';
export const NIGHT_SUMMARY_ENABLED_KEY = 'nightSummaryEnabled';
const ANDROID_CHANNEL_ID = 'class-reminders';
const DEFAULT_MINUTES_BEFORE = 30;
const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// expo-notifications' scheduling/permission APIs are native-only. On web they
// throw ("...is not available on web"), so every entry point below no-ops on web.
const IS_WEB = Platform.OS === 'web';

// Expo Go (SDK 53+) no longer ships the native module expo-notifications
// needs, and even importing the package there can throw and crash the whole
// app on load. Constants.appOwnership is 'expo' only inside the Expo Go app —
// development and production builds (including expo-dev-client) report null,
// so this keeps real push/local notification functionality intact for them.
// (Constants.executionEnvironment is the non-deprecated replacement, but it
// reports 'storeClient' for both Expo Go and expo-dev-client builds, which
// would wrongly disable notifications in dev-client builds too.)
const IS_EXPO_GO = Constants.appOwnership === 'expo';
const NOTIFICATIONS_UNAVAILABLE = IS_WEB || IS_EXPO_GO;

if (IS_EXPO_GO) {
    console.log('Push notifications unavailable in Expo Go — use a development build to test them.');
}

// Imported dynamically so nothing in the package — including its own
// module-level native module lookups — runs when notifications are
// unavailable, instead of throwing at import time and crashing the app.
type NotificationsModule = typeof import('expo-notifications');
let notificationsPromise: Promise<NotificationsModule> | null = null;
function getNotifications(): Promise<NotificationsModule> {
    if (!notificationsPromise) {
        notificationsPromise = import('expo-notifications');
    }
    return notificationsPromise;
}

function androidChannel(): string | undefined {
    return Platform.OS === 'android' ? ANDROID_CHANNEL_ID : undefined;
}

// Show the notification even when the app is foregrounded (native only).
if (!NOTIFICATIONS_UNAVAILABLE) {
    getNotifications().then((Notifications) => {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowBanner: true,
                shouldShowList: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
            }),
        });
    });
}

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
    if (NOTIFICATIONS_UNAVAILABLE) return false;
    const Notifications = await getNotifications();

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

// Schedules a reminder `minutesBefore` each of today's remaining classes.
// Does not clear existing notifications — syncReminders() does that once.
async function scheduleClassReminders(
    Notifications: NotificationsModule,
    classes: ReminderClass[],
    minutesBefore: number = DEFAULT_MINUTES_BEFORE
): Promise<void> {
    const now = Date.now();
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
                data: { url: '/timetable' },
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: new Date(fireAt),
                channelId: androidChannel(),
            },
        });
    }
}

// Schedules the night-before summary at 9 PM listing the next day's classes.
async function scheduleNightSummary(Notifications: NotificationsModule, timetable: ReminderClass[]): Promise<void> {
    const now = new Date();
    const fireAt = new Date(now);
    fireAt.setHours(21, 0, 0, 0);
    if (fireAt.getTime() <= now.getTime()) {
        fireAt.setDate(fireAt.getDate() + 1);
    }

    // A 9 PM summary is about the following day.
    const target = new Date(fireAt);
    target.setDate(target.getDate() + 1);
    const targetDay = WEEK_DAYS[target.getDay()];

    const classes = timetable
        .filter((c) => c.dayOfWeek === targetDay && c.status !== 'cancelled')
        .sort((a, b) => (classTimeToday(a.startTime)?.getTime() ?? 0) - (classTimeToday(b.startTime)?.getTime() ?? 0));

    const body =
        classes.length === 0
            ? 'You have no classes scheduled tomorrow.'
            : `${classes.length} class${classes.length === 1 ? '' : 'es'} tomorrow: ` +
              classes.slice(0, 4).map((c) => `${c.courseCode} ${c.startTime}`).join(', ');

    await Notifications.scheduleNotificationAsync({
        content: { title: "Tomorrow's classes", body, data: { url: '/timetable' } },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: fireAt,
            channelId: androidChannel(),
        },
    });
}

// Reschedules all local reminders from the current timetable, honouring the
// user's toggles. Call this whenever the timetable loads. Clears existing
// scheduled notifications first so nothing is duplicated.
export async function syncReminders(timetable: ReminderClass[]): Promise<void> {
    if (NOTIFICATIONS_UNAVAILABLE) return;
    const Notifications = await getNotifications();
    await Notifications.cancelAllScheduledNotificationsAsync();

    const perms = await Notifications.getPermissionsAsync();
    if (!perms.granted) return;
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
            name: 'Class reminders',
            importance: Notifications.AndroidImportance.HIGH,
        });
    }

    const classRemindersOn = (await getItem(CLASS_REMINDERS_ENABLED_KEY)) !== 'false';
    const nightSummaryOn = (await getItem(NIGHT_SUMMARY_ENABLED_KEY)) === 'true';

    if (classRemindersOn) {
        const today = WEEK_DAYS[new Date().getDay()];
        await scheduleClassReminders(Notifications, timetable.filter((c) => c.dayOfWeek === today));
    }
    if (nightSummaryOn) {
        await scheduleNightSummary(Notifications, timetable);
    }
}

export async function cancelAllReminders(): Promise<void> {
    if (NOTIFICATIONS_UNAVAILABLE) return;
    const Notifications = await getNotifications();
    await Notifications.cancelAllScheduledNotificationsAsync();
}

// Registers this device's Expo push token with the backend so it can receive
// remote push (announcements, cancellations, score releases). This is a no-op
// in Expo Go / without a development build, where getExpoPushTokenAsync is not
// available — it fails quietly and the app keeps working.
export async function registerForPushNotifications(authToken: string | null): Promise<void> {
    if (NOTIFICATIONS_UNAVAILABLE) return;
    try {
        const granted = await ensureNotificationPermissions();
        if (!granted) return;

        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        if (!projectId) return;

        const Notifications = await getNotifications();
        const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
        await apiRequest('/notifications/register-token', {
            method: 'POST',
            token: authToken,
            body: { token: expoPushToken },
        });
    } catch {
        // Expected before the dev build / FCM is set up — ignore.
    }
}

// True only when the user has enabled class reminders AND granted permission.
// Used by screens to decide whether to (re)schedule without prompting.
export async function classRemindersActive(): Promise<boolean> {
    if (NOTIFICATIONS_UNAVAILABLE) return false;
    if ((await getItem(CLASS_REMINDERS_ENABLED_KEY)) === 'false') return false;
    const Notifications = await getNotifications();
    const perms = await Notifications.getPermissionsAsync();
    return perms.granted;
}
