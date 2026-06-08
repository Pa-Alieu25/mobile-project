import { AppColors } from '@/constants/colors';
import { router } from 'expo-router';
import {
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
    dueDate: string;
    instructions: string;
    fileName: string;
    postedBy: string;
};

const assignments: Assignment[] = [];

export default function AssignmentsScreen() {
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
                    View assignment details and access files uploaded by course reps.
                </Text>

                {assignments.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>No assignments yet</Text>
                        <Text style={styles.emptyText}>
                            Assignments posted by course reps will appear here. Students will
                            be able to view the details and open or download attached files.
                        </Text>
                    </View>
                ) : (
                    assignments.map((assignment) => (
                        <View key={assignment.id} style={styles.assignmentCard}>
                            <Text style={styles.courseCode}>{assignment.courseCode}</Text>
                            <Text style={styles.assignmentTitle}>{assignment.title}</Text>
                            <Text style={styles.dueDate}>Due: {assignment.dueDate}</Text>
                            <Text style={styles.instructions}>{assignment.instructions}</Text>

                            <View style={styles.fileBox}>
                                <Text style={styles.fileLabel}>Attached file</Text>
                                <Text style={styles.fileName}>{assignment.fileName}</Text>
                            </View>

                            <TouchableOpacity style={styles.downloadButton}>
                                <Text style={styles.downloadButtonText}>Open File</Text>
                            </TouchableOpacity>

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
        marginBottom: 22,
        lineHeight: 20,
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
    courseCode: {
        alignSelf: 'flex-start',
        backgroundColor: AppColors.background,
        color: AppColors.primary,
        fontSize: 12,
        fontWeight: '900',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 14,
        marginBottom: 10,
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
    postedBy: {
        marginTop: 12,
        fontSize: 12,
        color: AppColors.mutedText,
        fontWeight: '600',
    },
});