import { OfflineBanner } from '@/components/offline-banner';
import { BottomNav } from '@/components/ui/bottom-nav';
import { AppColors } from '@/constants/colors';
import { Fonts, cardShadow } from '@/constants/ui';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/services/api';
import { CacheKeys, fetchWithCache, writeCache } from '@/services/cache';
import { formatFileSize, openAssignmentDocument } from '@/services/documents';
import { getItem } from '@/services/storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
    postedByUserId?: number | null;
    documentName?: string | null;
    documentType?: string | null;
    documentSize?: number | null;
    completed: boolean;
};

type AssignmentTab = 'pending' | 'completed';

export default function AssignmentsScreen() {
    const { token, role } = useAuth();
    const isManager = role === 'course_rep' || role === 'admin';
    const [activeTab, setActiveTab] = useState<AssignmentTab>('pending');
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [downloadingId, setDownloadingId] = useState<number | null>(null);
    const [flash, setFlash] = useState<string | null>(null);
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

    // Load the signed-in user's id so reps see manage controls only on their own posts.
    useEffect(() => {
        (async () => {
            const raw = await getItem('userId');
            if (raw) setCurrentUserId(Number(raw));
        })();
    }, []);

    const showFlash = (message: string) => {
        setFlash(message);
        setTimeout(() => setFlash(null), 2500);
    };

    const canManage = (a: Assignment) =>
        role === 'admin' || (role === 'course_rep' && a.postedByUserId != null && a.postedByUserId === currentUserId);

    const confirmDelete = (a: Assignment) => {
        Alert.alert(
            'Delete this assignment?',
            'Students will no longer be able to view it. This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => handleDelete(a) },
            ]
        );
    };

    const handleDelete = async (a: Assignment) => {
        try {
            await apiRequest(`/assignments/${a.id}`, { method: 'DELETE', token });
            const next = assignments.filter((item) => item.id !== a.id);
            setAssignments(next);
            await writeCache(CacheKeys.assignments, next); // keep offline cache in sync
            showFlash('Assignment deleted.');
        } catch (e) {
            Alert.alert('Could not delete', e instanceof Error ? e.message : 'The assignment is still there. Please try again.');
        }
    };

    const handleOpenDocument = async (a: Assignment) => {
        if (!a.documentName) return;
        try {
            setDownloadingId(a.id);
            await openAssignmentDocument(a.id, a.documentName, token);
        } catch (e) {
            Alert.alert('Could not open document', e instanceof Error ? e.message : 'Please try again.');
        } finally {
            setDownloadingId(null);
        }
    };

    const pendingAssignments = useMemo(
        () => assignments.filter((a) => !a.completed),
        [assignments]
    );

    const completedAssignments = useMemo(
        () => assignments.filter((a) => a.completed),
        [assignments]
    );

    const visibleAssignments = activeTab === 'pending' ? pendingAssignments : completedAssignments;

    const onRefresh = () => {
        setRefreshing(true);
        loadAssignments();
    };

    // Persisted per-student on the backend (keyed to the signed-in user's id),
    // so completion survives sign-out/sign-in and does not affect other students.
    async function setCompletion(assignmentId: number, completed: boolean) {
        const next = assignments.map((a) => (a.id === assignmentId ? { ...a, completed } : a));
        setAssignments(next);
        await writeCache(CacheKeys.assignments, next);
        try {
            await apiRequest(`/assignments/${assignmentId}/complete`, {
                method: completed ? 'PUT' : 'DELETE',
                token,
            });
        } catch (e) {
            // Roll back on failure so the UI doesn't claim a status that didn't save.
            setAssignments(assignments);
            await writeCache(CacheKeys.assignments, assignments);
            Alert.alert('Could not update', e instanceof Error ? e.message : 'Please try again.');
        }
    }

    async function handleMarkAsDone(assignmentId: number) {
        await setCompletion(assignmentId, true);
    }

    async function handleMoveToPending(assignmentId: number) {
        await setCompletion(assignmentId, false);
    }

    const tabs: { key: AssignmentTab; label: string; count: number }[] = [
        { key: 'pending', label: 'Pending', count: pendingAssignments.length },
        { key: 'completed', label: 'Completed', count: completedAssignments.length },
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

                <Text style={styles.title}>Assignments</Text>
                <Text style={styles.subtitle}>
                    Track due dates and mark work as done.
                </Text>

                {isOffline && <OfflineBanner />}

                <View style={styles.tabContainer}>
                    {tabs.map((tab) => (
                        <TouchableOpacity
                            key={tab.key}
                            style={[styles.tabButton, activeTab === tab.key && styles.activeTabButton]}
                            onPress={() => setActiveTab(tab.key)}
                        >
                            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
                                {tab.label} ({tab.count})
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {flash && (
                    <View style={styles.flash}>
                        <Ionicons name="checkmark-circle" size={16} color={AppColors.success} />
                        <Text style={styles.flashText}>{flash}</Text>
                    </View>
                )}

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
                        <Ionicons
                            name={activeTab === 'pending' ? 'checkmark-done-circle-outline' : 'document-text-outline'}
                            size={30}
                            color={AppColors.mutedText}
                        />
                        <Text style={styles.emptyTitle}>
                            {activeTab === 'pending' ? "You're all caught up" : 'No completed assignments'}
                        </Text>
                        <Text style={styles.emptyText}>
                            {activeTab === 'pending'
                                ? 'Assignments posted by course reps appear here with due dates and instructions. Pull down to refresh.'
                                : 'Assignments you mark as done appear here so you can track completed work.'}
                        </Text>
                    </View>
                ) : (
                    visibleAssignments.map((assignment) => {
                        const isCompleted = assignment.completed;
                        return (
                            <View key={assignment.id} style={[styles.assignmentCard, cardShadow]}>
                                <View style={styles.cardHeader}>
                                    <View style={[styles.iconBadge, isCompleted ? styles.iconBadgeGreen : styles.iconBadgeGold]}>
                                        <Ionicons
                                            name={isCompleted ? 'checkmark-done-outline' : 'document-text-outline'}
                                            size={18}
                                            color={isCompleted ? AppColors.success : AppColors.accent}
                                        />
                                    </View>
                                    <Text style={styles.courseCode}>{assignment.courseCode}</Text>
                                    <Text style={[styles.statusBadge, isCompleted && styles.completedBadge]}>
                                        {isCompleted ? 'Completed' : 'Pending'}
                                    </Text>
                                    {canManage(assignment) && (
                                        <TouchableOpacity onPress={() => confirmDelete(assignment)} hitSlop={8} style={styles.menuButton}>
                                            <Ionicons name="ellipsis-vertical" size={18} color={AppColors.mutedText} />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                <Text style={styles.assignmentTitle}>{assignment.title}</Text>

                                <View style={styles.dueRow}>
                                    <Ionicons name="calendar-outline" size={15} color={AppColors.warning} />
                                    <Text style={styles.dueDate}>Due {assignment.dueDate}</Text>
                                </View>

                                <Text style={styles.instructions}>{assignment.description}</Text>

                                {assignment.documentName && (
                                    <TouchableOpacity
                                        style={styles.docButton}
                                        onPress={() => handleOpenDocument(assignment)}
                                        disabled={downloadingId === assignment.id}
                                    >
                                        <View style={styles.docButtonIcon}>
                                            <Ionicons name="document-attach" size={18} color={AppColors.primary} />
                                        </View>
                                        <View style={styles.docButtonBody}>
                                            <Text style={styles.docButtonName} numberOfLines={1}>{assignment.documentName}</Text>
                                            <Text style={styles.docButtonMeta}>
                                                {downloadingId === assignment.id
                                                    ? 'Opening…'
                                                    : `Tap to open${assignment.documentSize ? ` · ${formatFileSize(assignment.documentSize)}` : ''}`}
                                            </Text>
                                        </View>
                                        {downloadingId === assignment.id ? (
                                            <ActivityIndicator size="small" color={AppColors.primary} />
                                        ) : (
                                            <Ionicons name="download-outline" size={20} color={AppColors.primary} />
                                        )}
                                    </TouchableOpacity>
                                )}

                                {!isCompleted ? (
                                    <TouchableOpacity
                                        style={styles.doneButton}
                                        onPress={() => handleMarkAsDone(assignment.id)}
                                    >
                                        <Ionicons name="checkmark" size={18} color={AppColors.card} />
                                        <Text style={styles.doneButtonText}>Mark as done</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        style={styles.undoButton}
                                        onPress={() => handleMoveToPending(assignment.id)}
                                    >
                                        <Ionicons name="arrow-undo-outline" size={16} color={AppColors.primary} />
                                        <Text style={styles.undoButtonText}>Move back to pending</Text>
                                    </TouchableOpacity>
                                )}

                                <Text style={styles.postedBy}>Posted by {assignment.postedBy}</Text>
                            </View>
                        );
                    })
                )}
            </ScrollView>

            <BottomNav active="tasks" />
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
        fontFamily: Fonts.bodyBold,
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
        padding: 22,
        borderWidth: 1,
        borderColor: AppColors.border,
        alignItems: 'center',
        ...cardShadow,
    },
    emptyTitle: {
        fontSize: 18,
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
    assignmentCard: {
        backgroundColor: AppColors.card,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: AppColors.border,
        marginBottom: 14,
    },
    flash: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: AppColors.success + '18',
        borderWidth: 1,
        borderColor: AppColors.success + '40',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginBottom: 14,
    },
    flashText: { color: AppColors.success, fontSize: 13, fontFamily: Fonts.bodyBold },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 10,
    },
    menuButton: {
        marginLeft: 2,
    },
    docButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: AppColors.primary + '33',
        backgroundColor: AppColors.primary + '0D',
        marginBottom: 14,
    },
    docButtonIcon: {
        width: 38, height: 38, borderRadius: 11, backgroundColor: AppColors.card,
        justifyContent: 'center', alignItems: 'center',
    },
    docButtonBody: { flex: 1 },
    docButtonName: { fontSize: 14, fontFamily: Fonts.bodyBold, color: AppColors.text },
    docButtonMeta: { fontSize: 12, color: AppColors.mutedText, marginTop: 2, fontFamily: Fonts.body },
    iconBadge: {
        width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center',
    },
    iconBadgeGold: { backgroundColor: AppColors.accent + '1F' },
    iconBadgeGreen: { backgroundColor: AppColors.primary + '14' },
    courseCode: {
        flex: 1,
        color: AppColors.primary,
        fontSize: 13,
        fontFamily: Fonts.bodyBold,
        letterSpacing: 0.3,
    },
    statusBadge: {
        backgroundColor: AppColors.warning,
        color: AppColors.card,
        fontSize: 11,
        fontFamily: Fonts.bodyBold,
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
        fontFamily: Fonts.headingSemi,
        color: AppColors.text,
        marginBottom: 8,
    },
    dueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
    },
    dueDate: {
        fontSize: 14,
        fontFamily: Fonts.bodyMedium,
        color: AppColors.warning,
    },
    instructions: {
        fontSize: 14,
        color: AppColors.mutedText,
        lineHeight: 21,
        marginBottom: 14,
        fontFamily: Fonts.body,
    },
    doneButton: {
        height: 48,
        borderRadius: 12,
        backgroundColor: AppColors.success,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 7,
        marginTop: 10,
    },
    doneButtonText: {
        color: AppColors.card,
        fontSize: 15,
        fontFamily: Fonts.bodyBold,
    },
    undoButton: {
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: AppColors.primary,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 7,
        marginTop: 10,
        backgroundColor: AppColors.card,
    },
    undoButtonText: {
        color: AppColors.primary,
        fontSize: 15,
        fontFamily: Fonts.bodyBold,
    },
    postedBy: {
        marginTop: 12,
        fontSize: 12,
        color: AppColors.mutedText,
        fontFamily: Fonts.bodyMedium,
    },
});
