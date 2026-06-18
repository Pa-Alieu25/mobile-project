import { AppColors } from '@/constants/colors';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type AssignmentStatus = 'pending' | 'completed';

type Assignment = {
    id: number;
    courseCode: string;
    title: string;
    dueDate: string;
    instructions: string;
    fileName: string;
    postedBy: string;
    status: AssignmentStatus;
};

type AssignmentTab = 'pending' | 'completed';

// Backend data will be loaded into this list later.
// Keep this empty for now so the app does not show fake assignment records.
const initialAssignments: Assignment[] = [];

export default function AssignmentsScreen() {
    const [activeTab, setActiveTab] = useState<AssignmentTab>('pending');
    const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);

    const pendingAssignments = useMemo(
        () => assignments.filter((assignment) => assignment.status === 'pending'),
        [assignments]
    );

    const completedAssignments = useMemo(
        () => assignments.filter((assignment) => assignment.status === 'completed'),
        [assignments]
    );

    const visibleAssignments =
        activeTab === 'pending' ? pendingAssignments : completedAssignments;

    function handleMarkAsDone(assignmentId: number) {
        setAssignments((currentAssignments) =>
            currentAssignments.map((assignment) =>
                assignment.id === assignmentId
                    ? { ...assignment, status: 'completed' }
                    : assignment
            )
        );
    }

    function handleMoveToPending(assignmentId: number) {
        setAssignments((currentAssignments) =>
            currentAssignments.map((assignment) =>
                assignment.id === assignmentId
                    ? { ...assignment, status: 'pending' }
                    : assignment
            )
        );
    }

    function handleOpenFile() {
        Alert.alert(
            'File opening not connected yet',
            'Assignment files will open or download when backend file storage is connected.'
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>

                <Text style={styles.title}>Assignments</Text>
                <Text style={styles.subtitle}>
                    Track pending assignments, view attached files, and mark completed work.
                </Text>

                <View style={styles.summaryCard}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryNumber}>{pendingAssignments.length}</Text>
                        <Text style={styles.summaryLabel}>Pending</Text>
                    </View>

                    <View style={styles.summaryDivider} />

                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryNumber}>{completedAssignments.length}</Text>
                        <Text style={styles.summaryLabel}>Completed</Text>
                    </View>
                </View>

                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[
                            styles.tabButton,
                            activeTab === 'pending' && styles.activeTabButton,
                        ]}
                        onPress={() => setActiveTab('pending')}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === 'pending' && styles.activeTabText,
                            ]}
                        >
                            Pending
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.tabButton,
                            activeTab === 'completed' && styles.activeTabButton,
                        ]}
                        onPress={() => setActiveTab('completed')}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === 'completed' && styles.activeTabText,
                            ]}
                        >
                            Completed
                        </Text>
                    </TouchableOpacity>
                </View>

                {visibleAssignments.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>
                            {activeTab === 'pending'
                                ? 'No pending assignments'
                                : 'No completed assignments'}
                        </Text>
                        <Text style={styles.emptyText}>
                            {activeTab === 'pending'
                                ? 'Assignments posted by course reps will appear here with due dates, instructions, and attached files.'
                                : 'Assignments you mark as done will appear here so you can track completed work.'}
                        </Text>
                    </View>
                ) : (
                    visibleAssignments.map((assignment) => (
                        <View key={assignment.id} style={styles.assignmentCard}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.courseCode}>{assignment.courseCode}</Text>
                                <Text
                                    style={[
                                        styles.statusBadge,
                                        assignment.status === 'completed' && styles.completedBadge,
                                    ]}
                                >
                                    {assignment.status === 'pending' ? 'Pending' : 'Completed'}
                                </Text>
                            </View>

                            <Text style={styles.assignmentTitle}>{assignment.title}</Text>
                            <Text style={styles.dueDate}>Due: {assignment.dueDate}</Text>
                            <Text style={styles.instructions}>{assignment.instructions}</Text>

                            <View style={styles.fileBox}>
                                <Text style={styles.fileLabel}>Attached file</Text>
                                <Text style={styles.fileName}>{assignment.fileName}</Text>
                            </View>

                            <TouchableOpacity
                                style={styles.downloadButton}
                                onPress={handleOpenFile}
                            >
                                <Text style={styles.downloadButtonText}>Open File</Text>
                            </TouchableOpacity>

                            {assignment.status === 'pending' ? (
                                <TouchableOpacity
                                    style={styles.doneButton}
                                    onPress={() => handleMarkAsDone(assignment.id)}
                                >
                                    <Text style={styles.doneButtonText}>Mark as Done</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={styles.undoButton}
                                    onPress={() => handleMoveToPending(assignment.id)}
                                >
                                    <Text style={styles.undoButtonText}>Move Back to Pending</Text>
                                </TouchableOpacity>
                            )}

                            <Text style={styles.postedBy}>Posted by {assignment.postedBy}</Text>
                        </View>
                    ))
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
    fileBox: {
        backgroundColor: AppColors.background,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: AppColors.border,
        marginBottom: 12,
    },
    fileLabel: {
        fontSize: 12,
        color: AppColors.mutedText,
        fontWeight: '700',
        marginBottom: 4,
    },
    fileName: {
        fontSize: 14,
        color: AppColors.text,
        fontWeight: '800',
    },
    downloadButton: {
        height: 48,
        borderRadius: 12,
        backgroundColor: AppColors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    downloadButtonText: {
        color: AppColors.card,
        fontSize: 15,
        fontWeight: '800',
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