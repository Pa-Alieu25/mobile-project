import { AppColors } from '@/constants/colors';
import { NavigateButton } from '@/components/navigate-button';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/services/api';
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

function formatStatusLabel(status: string) {
    if (status === 'active') return 'Active';
    if (status === 'venue_changed') return 'Venue Changed';
    if (status === 'time_changed') return 'Time Changed';
    if (status === 'cancelled') return 'Cancelled';
    return status;
}

export default function TimetableScreen() {
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState<TimetableTab>('today');
    const [records, setRecords] = useState<TimetableRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const todayName = getTodayName();
    const tomorrowName = getTomorrowName();

    const loadTimetable = useCallback(async () => {
        try {
            setError(null);
            const data = await apiRequest<TimetableRecord[]>('/timetable', { token });
            setRecords(data);
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

    const activeClassesCount = records.filter((r) => r.status !== 'cancelled').length;
    const changedClassesCount = records.filter(
        (r) => r.status === 'venue_changed' || r.status === 'time_changed' || r.status === 'cancelled'
    ).length;

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
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>

                <Text style={styles.title}>Timetable</Text>
                <Text style={styles.subtitle}>
                    Today, tomorrow, and your full week at a glance.
                </Text>

                <View style={styles.summaryCard}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryNumber}>{activeClassesCount}</Text>
                        <Text style={styles.summaryLabel}>Active Classes</Text>
                    </View>

                    <View style={styles.summaryDivider} />

                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryNumber}>{changedClassesCount}</Text>
                        <Text style={styles.summaryLabel}>Updates</Text>
                    </View>
                </View>

                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'today' && styles.activeTabButton]}
                        onPress={() => setActiveTab('today')}
                    >
                        <Text style={[styles.tabText, activeTab === 'today' && styles.activeTabText]}>Today</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'tomorrow' && styles.activeTabButton]}
                        onPress={() => setActiveTab('tomorrow')}
                    >
                        <Text style={[styles.tabText, activeTab === 'tomorrow' && styles.activeTabText]}>Tomorrow</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'week' && styles.activeTabButton]}
                        onPress={() => setActiveTab('week')}
                    >
                        <Text style={[styles.tabText, activeTab === 'week' && styles.activeTabText]}>Week</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        {activeTab === 'today'
                            ? `Today - ${todayName}`
                            : activeTab === 'tomorrow'
                                ? `Tomorrow - ${tomorrowName}`
                                : 'Weekly Timetable'}
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
                            <Text style={styles.emptyTitle}>{getEmptyTitle()}</Text>
                            <Text style={styles.emptyText}>{getEmptyText()}</Text>
                        </View>
                    ) : (
                        visibleRecords.map((record) => (
                            <View key={record.id} style={styles.classCard}>
                                <View style={styles.classHeader}>
                                    <Text style={styles.courseCode}>{record.courseCode}</Text>
                                    <Text
                                        style={[
                                            styles.status,
                                            record.status === 'cancelled' && styles.cancelledStatus,
                                        ]}
                                    >
                                        {formatStatusLabel(record.status)}
                                    </Text>
                                </View>

                                <Text style={styles.courseTitle}>{record.courseTitle}</Text>

                                <Text style={styles.classDetail}>
                                    {record.dayOfWeek} - {record.startTime} - {record.endTime}
                                </Text>

                                <Text style={styles.classDetail}>Venue: {record.venue}</Text>
                                <Text style={styles.classDetail}>Lecturer: {record.lecturer}</Text>
                                <Text style={styles.classDetail}>Class Group: {record.classGroup}</Text>

                                {record.status !== 'cancelled' && <NavigateButton query={record.venue} />}
                            </View>
                        ))
                    )}
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
    backText: {
        color: AppColors.primary,
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 14,
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: AppColors.text,
    },
    subtitle: {
        fontSize: 14,
        color: AppColors.mutedText,
        marginTop: 6,
        marginBottom: 18,
        lineHeight: 20,
    },
    summaryCard: {
        backgroundColor: AppColors.card,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: AppColors.border,
        padding: 18,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    summaryNumber: {
        fontSize: 26,
        fontWeight: '900',
        color: AppColors.primary,
    },
    summaryLabel: {
        marginTop: 4,
        fontSize: 13,
        fontWeight: '700',
        color: AppColors.mutedText,
    },
    summaryDivider: {
        width: 1,
        height: 42,
        backgroundColor: AppColors.border,
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
        fontWeight: '800',
        color: AppColors.mutedText,
    },
    activeTabText: {
        color: AppColors.card,
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
    centered: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    emptyCard: {
        backgroundColor: AppColors.card,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: AppColors.text,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: AppColors.mutedText,
        lineHeight: 21,
    },
    retryButton: {
        height: 46,
        borderRadius: 12,
        backgroundColor: AppColors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
    },
    retryButtonText: {
        color: AppColors.card,
        fontSize: 15,
        fontWeight: '800',
    },
    classCard: {
        backgroundColor: AppColors.card,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: AppColors.border,
        marginBottom: 14,
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
        fontWeight: '900',
    },
    status: {
        color: AppColors.warning,
        fontSize: 12,
        fontWeight: '800',
    },
    cancelledStatus: {
        color: AppColors.danger,
    },
    courseTitle: {
        color: AppColors.text,
        fontSize: 17,
        fontWeight: '800',
        marginBottom: 8,
    },
    classDetail: {
        color: AppColors.mutedText,
        fontSize: 14,
        lineHeight: 21,
    },
});
