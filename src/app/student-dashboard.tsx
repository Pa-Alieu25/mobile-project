import { AppColors } from '@/constants/colors';
import { OfflineBanner } from '@/components/offline-banner';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/services/api';
import { CacheKeys, fetchWithCache } from '@/services/cache';
import { syncReminders } from '@/services/notifications';
import { getItem } from '@/services/storage';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TimetableRecord = {
    id: number;
    courseCode: string;
    courseTitle: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    venue: string;
    status: string;
};

type Assignment = {
    id: number;
    courseCode: string;
    title: string;
    dueDate: string;
};

type Announcement = {
    id: number;
    title: string;
    category: string;
    postedBy: string;
    postedAt: string;
};

const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Converts a "8:00 AM" / "2:30 PM" style string to minutes since midnight.
function parseTimeToMinutes(time: string): number | null {
    const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3]?.toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
}

type ExamCountdown = { days: number; courseCode: string; examDate: string };

// Best-effort parse of a free-text exam date; null if it can't be understood.
function parseExamDate(value: string): Date | null {
    const t = Date.parse(value);
    return Number.isNaN(t) ? null : new Date(t);
}

// Whole days from today to the given date (0 = today, negative = past).
function daysUntil(date: Date): number {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfDate = new Date(date);
    startOfDate.setHours(0, 0, 0, 0);
    return Math.round((startOfDate.getTime() - startOfToday.getTime()) / 86400000);
}

export default function StudentDashboard() {
    const { signOut, token } = useAuth();
    const [studentName, setStudentName] = useState('Student');
    const [programme, setProgramme] = useState('');
    const [level, setLevel] = useState('');

    const [timetable, setTimetable] = useState<TimetableRecord[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
    const [examCountdown, setExamCountdown] = useState<ExamCountdown | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        (async () => {
            const [name, prog, lvl, completedRaw] = await Promise.all([
                getItem('userName'),
                getItem('programme'),
                getItem('level'),
                getItem('completedAssignmentIds'),
            ]);
            if (name) setStudentName(name);
            if (prog) setProgramme(prog);
            if (lvl) setLevel(lvl);
            if (completedRaw) {
                try {
                    setCompletedIds(new Set<number>(JSON.parse(completedRaw)));
                } catch {
                    // ignore malformed cache
                }
            }
        })();
    }, []);

    const loadDashboard = useCallback(async () => {
        // One request failing should not blank out the others.
        const [tt, asg, ann] = await Promise.allSettled([
            fetchWithCache<TimetableRecord[]>(CacheKeys.timetable, '/timetable', token),
            fetchWithCache<Assignment[]>(CacheKeys.assignments, '/assignments', token),
            fetchWithCache<Announcement[]>(CacheKeys.announcements, '/announcements', token),
        ]);
        let offline = false;
        if (tt.status === 'fulfilled') { setTimetable(tt.value.data); offline = offline || tt.value.fromCache; }
        if (asg.status === 'fulfilled') { setAssignments(asg.value.data); offline = offline || asg.value.fromCache; }
        if (ann.status === 'fulfilled') { setAnnouncements(ann.value.data); offline = offline || ann.value.fromCache; }
        setIsOffline(offline);
        setIsLoading(false);
        setRefreshing(false);
    }, [token]);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    // Surface a countdown when the student has an exam within the next 14 days.
    useEffect(() => {
        (async () => {
            const index = await getItem('indexNumber');
            if (!index) return;
            try {
                const exams = await apiRequest<{ courseCode: string; examDate: string }[]>(
                    `/exam-venues/search?number=${encodeURIComponent(index)}`,
                    { token }
                );
                const soonest = exams
                    .map((e) => ({ e, date: parseExamDate(e.examDate) }))
                    .filter((x): x is { e: { courseCode: string; examDate: string }; date: Date } => x.date !== null)
                    .map((x) => ({ courseCode: x.e.courseCode, examDate: x.e.examDate, days: daysUntil(x.date) }))
                    .filter((x) => x.days >= 0 && x.days <= 14)
                    .sort((a, b) => a.days - b.days)[0];
                if (soonest) setExamCountdown(soonest);
            } catch {
                // No countdown if exams can't be loaded or the date isn't parseable.
            }
        })();
    }, [token]);

    const onRefresh = () => {
        setRefreshing(true);
        loadDashboard();
    };

    const handleSignOut = async () => {
        await signOut();
        router.replace('/');
    };

    const todayName = weekDays[new Date().getDay()];

    const todaysClasses = useMemo(
        () =>
            timetable
                .filter((c) => c.dayOfWeek === todayName && c.status !== 'cancelled')
                .sort((a, b) => (parseTimeToMinutes(a.startTime) ?? 0) - (parseTimeToMinutes(b.startTime) ?? 0)),
        [timetable, todayName]
    );

    const nextClass = useMemo(() => {
        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        return todaysClasses
            .map((c) => ({ record: c, start: parseTimeToMinutes(c.startTime) }))
            .filter((x): x is { record: TimetableRecord; start: number } => x.start !== null && x.start >= nowMinutes)
            .sort((a, b) => a.start - b.start)[0]?.record ?? null;
    }, [todaysClasses]);

    const pendingAssignments = useMemo(
        () => assignments.filter((a) => !completedIds.has(a.id)),
        [assignments, completedIds]
    );

    // Once the timetable loads, (re)schedule local reminders and the night-before
    // summary. syncReminders honours the user's toggles and never prompts here.
    useEffect(() => {
        if (isLoading) return;
        syncReminders(timetable);
    }, [isLoading, timetable]);

    const latestAnnouncement = announcements[0] ?? null;

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AppColors.primary} />
                }
            >
                <View style={styles.header}>
                    <View style={styles.headerText}>
                        <Text style={styles.greeting}>Hello, {studentName}</Text>
                        <Text style={styles.subGreeting}>
                            {todayName}
                            {programme ? ` · ${programme}${level ? ` · Level ${level}` : ''}` : ''}
                        </Text>
                    </View>

                    <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                        <Text style={styles.signOutText}>Sign out</Text>
                    </TouchableOpacity>
                </View>

                {isOffline && <OfflineBanner />}

                {examCountdown && (
                    <TouchableOpacity style={styles.examBanner} onPress={() => router.push('/exam-venue-search')}>
                        <Text style={styles.examBannerLabel}>Exam countdown</Text>
                        <Text style={styles.examBannerText}>
                            {examCountdown.days === 0
                                ? `${examCountdown.courseCode} exam is today`
                                : `${examCountdown.courseCode} exam in ${examCountdown.days} day${examCountdown.days === 1 ? '' : 's'}`}
                            {' · '}
                            {examCountdown.examDate}
                        </Text>
                    </TouchableOpacity>
                )}

                {isLoading ? (
                    <View style={styles.loadingCard}>
                        <ActivityIndicator size="large" color={AppColors.primary} />
                    </View>
                ) : (
                    <>
                        {/* Next class — the single most useful thing */}
                        <View style={styles.nextClassCard}>
                            <Text style={styles.nextClassLabel}>Next class</Text>
                            {nextClass ? (
                                <>
                                    <Text style={styles.nextClassTitle}>{nextClass.courseTitle}</Text>
                                    <Text style={styles.nextClassMeta}>
                                        {nextClass.startTime} – {nextClass.endTime} · {nextClass.venue}
                                    </Text>
                                </>
                            ) : (
                                <Text style={styles.nextClassEmpty}>
                                    {todaysClasses.length === 0
                                        ? 'Nothing scheduled today.'
                                        : "That's all your classes for today."}
                                </Text>
                            )}
                        </View>

                        {/* Today's schedule as real content */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Today&apos;s schedule</Text>
                                <TouchableOpacity onPress={() => router.push('/timetable')}>
                                    <Text style={styles.sectionLink}>Timetable</Text>
                                </TouchableOpacity>
                            </View>

                            {todaysClasses.length === 0 ? (
                                <Text style={styles.emptyLine}>No classes scheduled for today.</Text>
                            ) : (
                                todaysClasses.map((c) => (
                                    <View key={c.id} style={styles.rowCard}>
                                        <View style={styles.timePill}>
                                            <Text style={styles.timePillText}>{c.startTime}</Text>
                                        </View>
                                        <View style={styles.rowBody}>
                                            <Text style={styles.rowTitle}>{c.courseTitle}</Text>
                                            <Text style={styles.rowMeta}>{c.courseCode} · {c.venue}</Text>
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>

                        {/* Assignments due */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Assignments due</Text>
                                <TouchableOpacity onPress={() => router.push('/assignments')}>
                                    <Text style={styles.sectionLink}>All</Text>
                                </TouchableOpacity>
                            </View>

                            {pendingAssignments.length === 0 ? (
                                <Text style={styles.emptyLine}>You&apos;re all caught up.</Text>
                            ) : (
                                <>
                                    {pendingAssignments.slice(0, 3).map((a) => (
                                        <TouchableOpacity
                                            key={a.id}
                                            style={styles.rowCard}
                                            onPress={() => router.push('/assignments')}
                                        >
                                            <View style={styles.rowBody}>
                                                <Text style={styles.rowTitle}>{a.title}</Text>
                                                <Text style={styles.rowMeta}>{a.courseCode} · due {a.dueDate}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                    {pendingAssignments.length > 3 && (
                                        <Text style={styles.moreLine}>
                                            +{pendingAssignments.length - 3} more
                                        </Text>
                                    )}
                                </>
                            )}
                        </View>

                        {/* Latest announcement */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Latest announcement</Text>
                                <TouchableOpacity onPress={() => router.push('/announcements')}>
                                    <Text style={styles.sectionLink}>All</Text>
                                </TouchableOpacity>
                            </View>

                            {latestAnnouncement ? (
                                <TouchableOpacity style={styles.rowCard} onPress={() => router.push('/announcements')}>
                                    <View style={styles.rowBody}>
                                        <Text style={styles.rowTitle}>{latestAnnouncement.title}</Text>
                                        <Text style={styles.rowMeta}>
                                            {latestAnnouncement.category} · {latestAnnouncement.postedAt}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ) : (
                                <Text style={styles.emptyLine}>No announcements yet.</Text>
                            )}
                        </View>
                    </>
                )}

                {/* Quick actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick actions</Text>
                    <View style={styles.actionList}>
                        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/exam-venue-search')}>
                            <Text style={styles.actionTitle}>Exam venue search</Text>
                            <Text style={styles.actionText}>Find your exam venue by index number.</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/my-scores' as any)}>
                            <Text style={styles.actionTitle}>Midsem scores</Text>
                            <Text style={styles.actionText}>View your released midsem scores.</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/profile-settings' as any)}>
                            <Text style={styles.actionTitle}>Profile & settings</Text>
                            <Text style={styles.actionText}>Reminders, subscription, and account.</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: AppColors.background,
    },
    container: {
        flex: 1,
        backgroundColor: AppColors.background,
    },
    content: {
        padding: 20,
        paddingBottom: 36,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 18,
    },
    headerText: {
        flex: 1,
        paddingRight: 12,
    },
    greeting: {
        fontSize: 24,
        fontWeight: '800',
        color: AppColors.text,
    },
    subGreeting: {
        fontSize: 14,
        color: AppColors.mutedText,
        marginTop: 4,
    },
    signOutButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: AppColors.card,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    signOutText: {
        color: AppColors.primary,
        fontWeight: '700',
        fontSize: 13,
    },
    loadingCard: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    examBanner: {
        backgroundColor: AppColors.accent,
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
    },
    examBannerLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: AppColors.text,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    examBannerText: {
        fontSize: 15,
        fontWeight: '700',
        color: AppColors.text,
    },
    nextClassCard: {
        backgroundColor: AppColors.primary,
        borderRadius: 18,
        padding: 20,
        marginBottom: 22,
    },
    nextClassLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: AppColors.accent,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 10,
    },
    nextClassTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: AppColors.card,
        marginBottom: 6,
    },
    nextClassMeta: {
        fontSize: 14,
        color: AppColors.card,
        opacity: 0.9,
    },
    nextClassEmpty: {
        fontSize: 15,
        color: AppColors.card,
        opacity: 0.9,
        lineHeight: 21,
    },
    section: {
        marginBottom: 22,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: AppColors.text,
        marginBottom: 10,
    },
    sectionLink: {
        fontSize: 14,
        fontWeight: '700',
        color: AppColors.primary,
    },
    emptyLine: {
        fontSize: 14,
        color: AppColors.mutedText,
        lineHeight: 20,
    },
    moreLine: {
        fontSize: 13,
        color: AppColors.mutedText,
        fontWeight: '600',
        marginTop: 2,
    },
    rowCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: AppColors.card,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: AppColors.border,
        marginBottom: 10,
        gap: 12,
    },
    timePill: {
        backgroundColor: AppColors.background,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    timePillText: {
        fontSize: 13,
        fontWeight: '800',
        color: AppColors.primary,
    },
    rowBody: {
        flex: 1,
    },
    rowTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: AppColors.text,
        marginBottom: 3,
    },
    rowMeta: {
        fontSize: 13,
        color: AppColors.mutedText,
    },
    actionList: {
        gap: 10,
    },
    actionCard: {
        backgroundColor: AppColors.card,
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    actionTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: AppColors.primary,
        marginBottom: 3,
    },
    actionText: {
        fontSize: 13,
        color: AppColors.mutedText,
    },
});
