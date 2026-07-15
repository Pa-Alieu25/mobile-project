import { AppColors } from '@/constants/colors';
import { OfflineBanner } from '@/components/offline-banner';
import { useAuth } from '@/context/auth-context';
import { CacheKeys, fetchWithCache } from '@/services/cache';
import { classRemindersActive, syncClassReminders } from '@/services/notifications';
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

type Assignment = { id: number };

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

export default function StudentDashboard() {
    const { signOut, token } = useAuth();
    const [studentName, setStudentName] = useState('Student');
    const [programme, setProgramme] = useState('Programme not set');
    const [level, setLevel] = useState('Level not set');

    const [timetable, setTimetable] = useState<TimetableRecord[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
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
        // One screen failing to load should not blank out the others.
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
        () => timetable.filter((c) => c.dayOfWeek === todayName && c.status !== 'cancelled'),
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

    const pendingCount = useMemo(
        () => assignments.filter((a) => !completedIds.has(a.id)).length,
        [assignments, completedIds]
    );

    // Once today's classes are known, (re)schedule local reminders — but only if
    // the student already enabled them, so we never prompt from the dashboard.
    useEffect(() => {
        if (isLoading) return;
        (async () => {
            if (await classRemindersActive()) {
                await syncClassReminders(todaysClasses);
            }
        })();
    }, [isLoading, todaysClasses]);

    const latestAnnouncement = announcements[0] ?? null;

    const classesTodayContext = () => {
        if (todaysClasses.length === 0) return 'No classes today';
        if (nextClass) return `Next: ${nextClass.courseCode} · ${nextClass.startTime}`;
        return 'All done for today';
    };

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
                        <Text style={styles.subGreeting}>{todayName}</Text>
                    </View>

                    <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                        <Text style={styles.signOutText}>Sign out</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.profileCard}>
                    <Text style={styles.profileLabel}>Academic Profile</Text>
                    <Text style={styles.profileText}>{programme}</Text>
                    <Text style={styles.profileSubText}>{level}</Text>
                </View>

                {isOffline && <OfflineBanner />}

                {isLoading ? (
                    <View style={styles.loadingCard}>
                        <ActivityIndicator size="large" color={AppColors.primary} />
                    </View>
                ) : (
                    <>
                        <View style={styles.nextClassCard}>
                            <Text style={styles.nextClassLabel}>Next class</Text>
                            {nextClass ? (
                                <>
                                    <Text style={styles.nextClassTitle}>{nextClass.courseTitle}</Text>
                                    <Text style={styles.nextClassMeta}>
                                        {nextClass.startTime} – {nextClass.endTime}
                                    </Text>
                                    <Text style={styles.nextClassMeta}>{nextClass.venue}</Text>
                                </>
                            ) : (
                                <Text style={styles.nextClassEmpty}>
                                    {todaysClasses.length === 0
                                        ? 'You have no classes scheduled today.'
                                        : 'No more classes today.'}
                                </Text>
                            )}
                        </View>

                        <View style={styles.metricsRow}>
                            <TouchableOpacity style={styles.metricCard} onPress={() => router.push('/timetable')}>
                                <Text style={styles.metricLabel}>Classes today</Text>
                                <Text style={styles.metricValue}>{todaysClasses.length}</Text>
                                <Text style={styles.metricContext}>{classesTodayContext()}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.metricCard} onPress={() => router.push('/assignments')}>
                                <Text style={styles.metricLabel}>Assignments</Text>
                                <Text style={styles.metricValue}>{pendingCount}</Text>
                                <Text style={styles.metricContext}>
                                    {pendingCount === 0 ? 'All caught up' : pendingCount === 1 ? '1 to complete' : `${pendingCount} to complete`}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Latest announcement</Text>
                            <TouchableOpacity style={styles.card} onPress={() => router.push('/announcements')}>
                                {latestAnnouncement ? (
                                    <>
                                        <Text style={styles.announcementCategory}>{latestAnnouncement.category}</Text>
                                        <Text style={styles.announcementTitle}>{latestAnnouncement.title}</Text>
                                        <Text style={styles.announcementMeta}>
                                            {latestAnnouncement.postedBy} · {latestAnnouncement.postedAt}
                                        </Text>
                                    </>
                                ) : (
                                    <>
                                        <Text style={styles.emptyTitle}>No announcements yet</Text>
                                        <Text style={styles.emptyText}>
                                            Updates from your course rep will show here. Tap to view all.
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </>
                )}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick actions</Text>

                    <View style={styles.actionList}>
                        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/timetable')}>
                            <Text style={styles.actionTitle}>View Timetable</Text>
                            <Text style={styles.actionText}>Check today, tomorrow, and weekly classes.</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/exam-venue-search')}>
                            <Text style={styles.actionTitle}>Exam Venue Search</Text>
                            <Text style={styles.actionText}>Find your exam venue using your index number.</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/assignments')}>
                            <Text style={styles.actionTitle}>Assignments</Text>
                            <Text style={styles.actionText}>Track deadlines and completed work.</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/profile-settings' as any)}>
                            <Text style={styles.actionTitle}>Profile & Settings</Text>
                            <Text style={styles.actionText}>Manage reminders, sync, and account settings.</Text>
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
        marginBottom: 20,
    },
    headerText: {
        flex: 1,
        paddingRight: 12,
    },
    greeting: {
        fontSize: 26,
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
    profileCard: {
        backgroundColor: AppColors.primary,
        borderRadius: 18,
        padding: 18,
        marginBottom: 16,
    },
    profileLabel: {
        color: AppColors.accent,
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 8,
    },
    profileText: {
        color: AppColors.card,
        fontSize: 20,
        fontWeight: '800',
    },
    profileSubText: {
        color: AppColors.card,
        fontSize: 14,
        marginTop: 4,
    },
    loadingCard: {
        paddingVertical: 50,
        alignItems: 'center',
    },
    nextClassCard: {
        backgroundColor: AppColors.card,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: AppColors.border,
        borderLeftWidth: 4,
        borderLeftColor: AppColors.primary,
        marginBottom: 16,
    },
    nextClassLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: AppColors.primary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    nextClassTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: AppColors.text,
        marginBottom: 6,
    },
    nextClassMeta: {
        fontSize: 14,
        color: AppColors.mutedText,
        lineHeight: 20,
    },
    nextClassEmpty: {
        fontSize: 15,
        color: AppColors.mutedText,
        lineHeight: 21,
    },
    metricsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 22,
    },
    metricCard: {
        flex: 1,
        backgroundColor: AppColors.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    metricLabel: {
        fontSize: 13,
        color: AppColors.mutedText,
        fontWeight: '700',
    },
    metricValue: {
        fontSize: 28,
        color: AppColors.text,
        fontWeight: '900',
        marginTop: 6,
    },
    metricContext: {
        fontSize: 12,
        color: AppColors.mutedText,
        marginTop: 4,
    },
    section: {
        marginBottom: 22,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: AppColors.text,
        marginBottom: 10,
    },
    card: {
        backgroundColor: AppColors.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    announcementCategory: {
        alignSelf: 'flex-start',
        backgroundColor: AppColors.background,
        color: AppColors.primary,
        fontSize: 12,
        fontWeight: '800',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 8,
    },
    announcementTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: AppColors.text,
        marginBottom: 6,
    },
    announcementMeta: {
        fontSize: 13,
        color: AppColors.mutedText,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: AppColors.text,
        marginBottom: 6,
    },
    emptyText: {
        fontSize: 14,
        color: AppColors.mutedText,
        lineHeight: 20,
    },
    actionList: {
        gap: 12,
    },
    actionCard: {
        backgroundColor: AppColors.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: AppColors.primary,
        marginBottom: 4,
    },
    actionText: {
        fontSize: 14,
        color: AppColors.mutedText,
        lineHeight: 20,
    },
});
