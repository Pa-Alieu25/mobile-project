import { AppColors } from '@/constants/colors';
import { OfflineBanner } from '@/components/offline-banner';
import { useAuth } from '@/context/auth-context';
import { CacheKeys, fetchWithCache } from '@/services/cache';
import { getItem, setItem } from '@/services/storage';
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

type Assignment = {
    id: number;
    courseCode: string;
    title: string;
    description: string;
    dueDate: string;
    classGroup: string;
    postedBy: string;
};

type AssignmentTab = 'pending' | 'completed';

const COMPLETED_IDS_KEY = 'completedAssignmentIds';

export default function AssignmentsScreen() {
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState<AssignmentTab>('pending');
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isOffline, setIsOffline] = useState(false);

    const loadAssignments = useCallback(async () => {
        try {
            setError(null);
            const { data, fromCache } = await fetchWithCache<Assignment[]>(
                CacheKeys.assignments, '/assignments', token
            );
            setAssignments(data);
            setIsOffline(fromCache);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unable to load assignments.');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [token]);

    useEffect(() => {
        loadAssignments();
    }, [loadAssignments]);

    // Completion is tracked on the device, since the backend does not store it.
    useEffect(() => {
        (async () => {
            const raw = await getItem(COMPLETED_IDS_KEY);
            if (raw) {
                try {
                    setCompletedIds(new Set<number>(JSON.parse(raw)));
                } catch {
                    // ignore malformed cache
                }
            }
        })();
    }, []);

    const pendingAssignments = useMemo(
        () => assignments.filter((a) => !completedIds.has(a.id)),
        [assignments, completedIds]
    );

    const completedAssignments = useMemo(
        () => assignments.filter((a) => completedIds.has(a.id)),
        [assignments, completedIds]
    );

    const visibleAssignments = activeTab === 'pending' ? pendingAssignments : completedAssignments;

    const onRefresh = () => {
        setRefreshing(true);
        loadAssignments();
    };

    async function persistCompleted(next: Set<number>) {
        setCompletedIds(next);
        await setItem(COMPLETED_IDS_KEY, JSON.stringify([...next]));
    }

    async function handleMarkAsDone(assignmentId: number) {
        const next = new Set(completedIds);
        next.add(assignmentId);
        await persistCompleted(next);
    }

    async function handleMoveToPending(assignmentId: number) {
        const next = new Set(completedIds);
        next.delete(assignmentId);
        await persistCompleted(next);
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

                <Text style={styles.title}>Assignments</Text>
                <Text style={styles.subtitle}>
                    Track due dates and mark work as done.
                </Text>

                {isOffline && <OfflineBanner />}

                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'pending' && styles.activeTabButton]}
                        onPress={() => setActiveTab('pending')}
                    >
                        <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>Pending</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tabButton, activeTab === 'completed' && styles.activeTabButton]}
                        onPress={() => setActiveTab('completed')}
                    >
                        <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>Completed</Text>
                    </TouchableOpacity>
                </View>

                {isLoading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={AppColors.primary} />
                    </View>
                ) : error ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>Couldn&apos;t load assignments</Text>
                        <Text style={styles.emptyText}>{error}</Text>
                        <TouchableOpacity style={styles.doneButton} onPress={loadAssignments}>
                            <Text style={styles.doneButtonText}>Try again</Text>
                        </TouchableOpacity>
                    </View>
                ) : visibleAssignments.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>
                            {activeTab === 'pending' ? 'No pending assignments' : 'No completed assignments'}
                        </Text>
                        <Text style={styles.emptyText}>
                            {activeTab === 'pending'
                                ? 'Assignments posted by course reps appear here with due dates and instructions. Pull down to refresh.'
                                : 'Assignments you mark as done appear here so you can track completed work.'}
                        </Text>
                    </View>
                ) : (
                    visibleAssignments.map((assignment) => {
                        const isCompleted = completedIds.has(assignment.id);
                        return (
                            <View key={assignment.id} style={styles.assignmentCard}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.courseCode}>{assignment.courseCode}</Text>
                                    <Text style={[styles.statusBadge, isCompleted && styles.completedBadge]}>
                                        {isCompleted ? 'Completed' : 'Pending'}
                                    </Text>
                                </View>

                                <Text style={styles.assignmentTitle}>{assignment.title}</Text>
                                <Text style={styles.dueDate}>Due: {assignment.dueDate}</Text>
                                <Text style={styles.instructions}>{assignment.description}</Text>

                                {!isCompleted ? (
                                    <TouchableOpacity
                                        style={styles.doneButton}
                                        onPress={() => handleMarkAsDone(assignment.id)}
                                    >
                                        <Text style={styles.doneButtonText}>Mark as done</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        style={styles.undoButton}
                                        onPress={() => handleMoveToPending(assignment.id)}
                                    >
                                        <Text style={styles.undoButtonText}>Move back to pending</Text>
                                    </TouchableOpacity>
                                )}

                                <Text style={styles.postedBy}>Posted by {assignment.postedBy}</Text>
                            </View>
                        );
                    })
                )}
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
        marginBottom: 16,
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
        fontSize: 18,
        fontWeight: '800',
        color: AppColors.text,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: AppColors.mutedText,
        lineHeight: 21,
    },
    assignmentCard: {
        backgroundColor: AppColors.card,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: AppColors.border,
        marginBottom: 14,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        gap: 10,
    },
    courseCode: {
        alignSelf: 'flex-start',
        backgroundColor: AppColors.background,
        color: AppColors.primary,
        fontSize: 12,
        fontWeight: '900',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 14,
    },
    statusBadge: {
        backgroundColor: AppColors.warning,
        color: AppColors.card,
        fontSize: 11,
        fontWeight: '900',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        overflow: 'hidden',
        textTransform: 'uppercase',
    },
    completedBadge: {
        backgroundColor: AppColors.success,
    },
    assignmentTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: AppColors.text,
        marginBottom: 6,
    },
    dueDate: {
        fontSize: 14,
        fontWeight: '700',
        color: AppColors.warning,
        marginBottom: 8,
    },
    instructions: {
        fontSize: 14,
        color: AppColors.mutedText,
        lineHeight: 21,
        marginBottom: 14,
    },
    doneButton: {
        height: 48,
        borderRadius: 12,
        backgroundColor: AppColors.success,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    doneButtonText: {
        color: AppColors.card,
        fontSize: 15,
        fontWeight: '800',
    },
    undoButton: {
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: AppColors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        backgroundColor: AppColors.card,
    },
    undoButtonText: {
        color: AppColors.primary,
        fontSize: 15,
        fontWeight: '800',
    },
    postedBy: {
        marginTop: 12,
        fontSize: 12,
        color: AppColors.mutedText,
        fontWeight: '600',
    },
});
