import { NavigateButton } from '@/components/navigate-button';
import { OfflineBanner } from '@/components/offline-banner';
import { BottomNav } from '@/components/ui/bottom-nav';
import { StatusPill } from '@/components/ui/status-pill';
import { AppColors } from '@/constants/colors';
import { Fonts, cardShadow } from '@/constants/ui';
import { useAuth } from '@/context/auth-context';
import { CacheKeys, fetchWithCache } from '@/services/cache';
import { notifyCancelledClasses } from '@/services/notifications';
import { Ionicons } from '@expo/vector-icons';
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
    lecturer: string;
    classGroup: string;
    status: string;
};

type TimetableTab = 'today' | 'tomorrow' | 'week';

const weekDays = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
];

function getTodayName() {
    return weekDays[new Date().getDay()];
}

function getTomorrowName() {
    const tomorrowIndex = (new Date().getDay() + 1) % 7;
    return weekDays[tomorrowIndex];
}

export default function TimetableScreen() {
    const { token, role } = useAuth();
    const isManager = role === 'course_rep' || role === 'admin';
    const [activeTab, setActiveTab] = useState<TimetableTab>('today');
    const [records, setRecords] = useState<TimetableRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isOffline, setIsOffline] = useState(false);

    const todayName = getTodayName();
    const tomorrowName = getTomorrowName();

    const loadTimetable = useCallback(async () => {
        try {
            setError(null);
            const { data, fromCache } = await fetchWithCache<TimetableRecord[]>(
                CacheKeys.timetable, '/timetable', token
            );
            setRecords(data);
            setIsOffline(fromCache);
            // Alert the student about any class newly marked cancelled.
            await notifyCancelledClasses(
                data
                    .filter((r) => r.status === 'cancelled')
                    .map((r) => ({ id: r.id, courseCode: r.courseCode, dayOfWeek: r.dayOfWeek }))
            );
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unable to load the timetable.');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [token]);

    useEffect(() => {
        loadTimetable();
    }, [loadTimetable]);

    const todayRecords = useMemo(
        () => records.filter((r) => r.dayOfWeek === todayName),
        [records, todayName]
    );

    const tomorrowRecords = useMemo(
        () => records.filter((r) => r.dayOfWeek === tomorrowName),
        [records, tomorrowName]
    );

    const visibleRecords = useMemo(() => {
        if (activeTab === 'today') return todayRecords;
        if (activeTab === 'tomorrow') return tomorrowRecords;
        return records;
    }, [activeTab, todayRecords, tomorrowRecords, records]);

    const onRefresh = () => {
        setRefreshing(true);
        loadTimetable();
    };

    function getEmptyTitle() {
        if (activeTab === 'today') return 'No classes for today';
        if (activeTab === 'tomorrow') return 'No classes for tomorrow';
        return 'No timetable records yet';
    }

    function getEmptyText() {
        if (activeTab === 'today') return 'You have no classes scheduled for today. Pull down to refresh.';
        if (activeTab === 'tomorrow') return 'You have no classes scheduled for tomorrow. Pull down to refresh.';
        return 'Your weekly classes will appear here once your course rep adds them.';
    }

    const tabs: { key: TimetableTab; label: string }[] = [
        { key: 'today', label: 'Today' },
        { key: 'tomorrow', label: 'Tomorrow' },
        { key: 'week', label: 'Week' },
    ];

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AppColors.primary} />
                }
            >
                {isManager && (
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
                        <Ionicons name="chevron-back" size={22} color={AppColors.text} />
                    </TouchableOpacity>
                )}

                <Text style={styles.title}>Timetable</Text>
                <Text style={styles.subtitle}>
                    Today, tomorrow, and your full week at a glance.
                </Text>

                {isOffline && <OfflineBanner />}

                <View style={styles.tabContainer}>
                    {tabs.map((tab) => (
                        <TouchableOpacity
                            key={tab.key}
                            style={[styles.tabButton, activeTab === tab.key && styles.activeTabButton]}
                            onPress={() => setActiveTab(tab.key)}
                        >
                            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>{tab.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.sectionTitle}>
                    {activeTab === 'today'
                        ? `Today · ${todayName}`
                        : activeTab === 'tomorrow'
                            ? `Tomorrow · ${tomorrowName}`
                            : 'Weekly timetable'}
                </Text>

                {isLoading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={AppColors.primary} />
                    </View>
                ) : error ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>Couldn&apos;t load the timetable</Text>
                        <Text style={styles.emptyText}>{error}</Text>
                        <TouchableOpacity style={styles.retryButton} onPress={loadTimetable}>
                            <Text style={styles.retryButtonText}>Try again</Text>
                        </TouchableOpacity>
                    </View>
                ) : visibleRecords.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Ionicons name="calendar-outline" size={30} color={AppColors.mutedText} />
                        <Text style={styles.emptyTitle}>{getEmptyTitle()}</Text>
                        <Text style={styles.emptyText}>{getEmptyText()}</Text>
                    </View>
                ) : (
                    visibleRecords.map((record) => {
                        const cancelled = record.status === 'cancelled';
                        return (
                            <View key={record.id} style={[styles.classCard, cardShadow, cancelled && styles.cancelledCard]}>
                                <View style={styles.classHeader}>
                                    <Text style={styles.courseCode}>{record.courseCode}</Text>
                                    <StatusPill status={record.status} />
                                </View>

                                <Text style={[styles.courseTitle, cancelled && styles.strikethrough]}>{record.courseTitle}</Text>

                                <View style={styles.detailRow}>
                                    <Ionicons name="time-outline" size={16} color={AppColors.mutedText} />
                                    <Text style={styles.detailText}>{record.startTime} – {record.endTime} · {record.dayOfWeek}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Ionicons name="location-outline" size={16} color={AppColors.mutedText} />
                                    <Text style={styles.detailText}>{record.venue}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Ionicons name="person-outline" size={16} color={AppColors.mutedText} />
                                    <Text style={styles.detailText}>{record.lecturer}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Ionicons name="people-outline" size={16} color={AppColors.mutedText} />
                                    <Text style={styles.detailText}>{record.classGroup}</Text>
                                </View>

                                {!cancelled && (
                                    <View style={styles.navigateWrap}>
                                        <NavigateButton query={record.venue} />
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>

            <BottomNav active="timetable" />
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
    backButton: {
        width: 40, height: 40, borderRadius: 12, backgroundColor: AppColors.card,
        borderWidth: 1, borderColor: AppColors.border, justifyContent: 'center', alignItems: 'center', marginBottom: 14,
    },
    title: {
        fontSize: 28,
        fontFamily: Fonts.heading,
        color: AppColors.text,
    },
    subtitle: {
        fontSize: 14,
        color: AppColors.mutedText,
        marginTop: 6,
        marginBottom: 18,
        lineHeight: 20,
        fontFamily: Fonts.body,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: AppColors.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: AppColors.border,
        padding: 5,
        marginBottom: 18,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 11,
        borderRadius: 10,
        alignItems: 'center',
    },
    activeTabButton: {
        backgroundColor: AppColors.primary,
    },
    tabText: {
        fontSize: 14,
        fontFamily: Fonts.bodyBold,
        color: AppColors.mutedText,
    },
    activeTabText: {
        color: AppColors.card,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: Fonts.headingSemi,
        color: AppColors.text,
        marginBottom: 12,
    },
    centered: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    emptyCard: {
        backgroundColor: AppColors.card,
        borderRadius: 18,
        padding: 22,
        borderWidth: 1,
        borderColor: AppColors.border,
        alignItems: 'center',
        ...cardShadow,
    },
    emptyTitle: {
        fontSize: 17,
        fontFamily: Fonts.headingSemi,
        color: AppColors.text,
        marginTop: 10,
        marginBottom: 6,
    },
    emptyText: {
        fontSize: 14,
        color: AppColors.mutedText,
        lineHeight: 21,
        textAlign: 'center',
        fontFamily: Fonts.body,
    },
    retryButton: {
        height: 46,
        borderRadius: 12,
        backgroundColor: AppColors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 14,
        paddingHorizontal: 24,
    },
    retryButtonText: {
        color: AppColors.card,
        fontSize: 15,
        fontFamily: Fonts.bodyBold,
    },
    classCard: {
        backgroundColor: AppColors.card,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: AppColors.border,
        marginBottom: 14,
    },
    cancelledCard: {
        borderColor: AppColors.danger + '55',
    },
    classHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        gap: 10,
    },
    courseCode: {
        color: AppColors.primary,
        fontSize: 13,
        fontFamily: Fonts.bodyBold,
        letterSpacing: 0.3,
    },
    courseTitle: {
        color: AppColors.text,
        fontSize: 17,
        fontFamily: Fonts.headingSemi,
        marginBottom: 12,
    },
    strikethrough: {
        textDecorationLine: 'line-through',
        color: AppColors.mutedText,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        marginBottom: 7,
    },
    detailText: {
        color: AppColors.mutedText,
        fontSize: 14,
        flex: 1,
        fontFamily: Fonts.body,
    },
    navigateWrap: {
        marginTop: 6,
    },
});
