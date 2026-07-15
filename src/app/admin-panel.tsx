import { AppColors } from '@/constants/colors';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/services/api';
import { getItem } from '@/services/storage';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type PendingUser = {
    id: number;
    fullName: string;
    email: string;
    indexNumber: string;
    programme: string;
    level: string;
};

export default function AdminPanel() {
    const { signOut, token } = useAuth();
    const [adminName, setAdminName] = useState('Admin');
    const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
    const [counts, setCounts] = useState({ announcements: 0, assignments: 0, classes: 0 });
    const [isLoading, setIsLoading] = useState(true);

    const fetchPendingUsers = useCallback(async () => {
        try {
            const data = await apiRequest<PendingUser[]>('/admin/pending-reps', { token });
            setPendingUsers(data);
        } catch (error) {
            console.error('Failed to fetch pending users', error);
        }
    }, [token]);

    const loadOverview = useCallback(async () => {
        const [ann, asg, tt] = await Promise.allSettled([
            apiRequest<unknown[]>('/announcements', { token }),
            apiRequest<unknown[]>('/assignments', { token }),
            apiRequest<unknown[]>('/timetable', { token }),
        ]);
        setCounts({
            announcements: ann.status === 'fulfilled' ? ann.value.length : 0,
            assignments: asg.status === 'fulfilled' ? asg.value.length : 0,
            classes: tt.status === 'fulfilled' ? tt.value.length : 0,
        });
        await fetchPendingUsers();
        setIsLoading(false);
    }, [token, fetchPendingUsers]);

    useEffect(() => {
        (async () => {
            const name = await getItem('userName');
            if (name) setAdminName(name);
            loadOverview();
        })();
    }, [loadOverview]);

    const handleApprove = async (userId: number) => {
        try {
            await apiRequest(`/admin/approve-rep/${userId}`, { method: 'POST', token });
            Alert.alert('Approved', 'Course rep account has been approved.');
            fetchPendingUsers();
        } catch {
            Alert.alert('Error', 'Failed to approve this account.');
        }
    };

    const handleReject = async (userId: number) => {
        try {
            await apiRequest(`/admin/reject-rep/${userId}`, { method: 'POST', token });
            Alert.alert('Rejected', 'Course rep request has been rejected.');
            fetchPendingUsers();
        } catch {
            Alert.alert('Error', 'Failed to reject this request.');
        }
    };

    const handleSignOut = async () => {
        await signOut();
        router.replace('/');
    };

    const metrics = [
        { label: 'Pending reps', value: pendingUsers.length, context: pendingUsers.length === 0 ? 'none waiting' : 'awaiting review' },
        { label: 'Announcements', value: counts.announcements, context: 'posted' },
        { label: 'Assignments', value: counts.assignments, context: 'listed' },
        { label: 'Classes', value: counts.classes, context: 'in timetable' },
    ];

    const tools = [
        { title: 'Post Announcement', text: 'Share class updates, cancellations, and reminders.', route: '/post-announcement' },
        { title: 'Manage Timetable', text: 'Add or update class times, lecturers, and venues.', route: '/manage-timetable' },
        { title: 'Add Assignment', text: 'Record assignment details, due dates, and instructions.', route: '/add-assignment' },
        { title: 'Upload Exam Venue Info', text: 'Add exam venue ranges for students to search.', route: '/manage-exam-venues' },
        { title: 'View Announcements', text: 'See all announcements posted to students.', route: '/announcements' },
        { title: 'View Timetable', text: 'Check today, tomorrow, and weekly classes.', route: '/timetable' },
        { title: 'View Assignments', text: 'Track all posted assignments and deadlines.', route: '/assignments' },
        { title: 'Exam Venue Search', text: 'Find exam venues using an index number.', route: '/exam-venue-search' },
    ];

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <View style={styles.headerText}>
                        <Text style={styles.title}>Admin Panel</Text>
                        <Text style={styles.subtitle}>Hello, {adminName}</Text>
                    </View>
                    <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                        <Text style={styles.signOutText}>Sign out</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>Overview</Text>
                {isLoading ? (
                    <View style={styles.loadingCard}>
                        <ActivityIndicator size="large" color={AppColors.primary} />
                    </View>
                ) : (
                    <View style={styles.metricsGrid}>
                        {metrics.map((metric) => (
                            <View key={metric.label} style={styles.metricCard}>
                                <Text style={styles.metricLabel}>{metric.label}</Text>
                                <Text style={styles.metricValue}>{metric.value}</Text>
                                <Text style={styles.metricContext}>{metric.context}</Text>
                            </View>
                        ))}
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Pending course rep requests ({pendingUsers.length})</Text>
                    {pendingUsers.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyTitle}>No pending requests</Text>
                            <Text style={styles.emptyText}>When students register as course reps, their requests appear here.</Text>
                        </View>
                    ) : (
                        pendingUsers.map((user) => (
                            <View key={user.id} style={styles.userCard}>
                                <Text style={styles.userName}>{user.fullName}</Text>
                                <Text style={styles.userDetail}>{user.email}</Text>
                                <Text style={styles.userDetail}>Index: {user.indexNumber}</Text>
                                <Text style={styles.userDetail}>{user.programme} — Level {user.level}</Text>
                                <View style={styles.actionRow}>
                                    <TouchableOpacity style={styles.approveButton} onPress={() => handleApprove(user.id)}>
                                        <Text style={styles.approveText}>Approve</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.rejectButton} onPress={() => handleReject(user.id)}>
                                        <Text style={styles.rejectText}>Reject</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}
                    <TouchableOpacity style={styles.refreshButton} onPress={fetchPendingUsers}>
                        <Text style={styles.refreshText}>Refresh list</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Academic tools</Text>
                    <View style={styles.actionList}>
                        {tools.map((item) => (
                            <TouchableOpacity key={item.route} style={styles.actionCard} onPress={() => router.push(item.route as any)}>
                                <Text style={styles.actionTitle}>{item.title}</Text>
                                <Text style={styles.actionText}>{item.text}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: AppColors.background },
    container: { flex: 1, backgroundColor: AppColors.background },
    content: { padding: 20, paddingBottom: 36 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    headerText: { flex: 1, paddingRight: 12 },
    title: { fontSize: 26, fontWeight: '800', color: AppColors.text },
    subtitle: { fontSize: 14, color: AppColors.mutedText, marginTop: 4 },
    signOutButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: AppColors.card, borderWidth: 1, borderColor: AppColors.border },
    signOutText: { color: AppColors.primary, fontWeight: '700', fontSize: 13 },
    loadingCard: { paddingVertical: 40, alignItems: 'center' },
    metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 22 },
    metricCard: { flexBasis: '47%', flexGrow: 1, backgroundColor: AppColors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: AppColors.border },
    metricLabel: { fontSize: 13, color: AppColors.mutedText, fontWeight: '700' },
    metricValue: { fontSize: 28, color: AppColors.text, fontWeight: '900', marginTop: 6 },
    metricContext: { fontSize: 12, color: AppColors.mutedText, marginTop: 4 },
    section: { marginBottom: 22 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: AppColors.text, marginBottom: 10 },
    emptyCard: { backgroundColor: AppColors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: AppColors.border, marginBottom: 12 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: AppColors.text, marginBottom: 6 },
    emptyText: { fontSize: 14, color: AppColors.mutedText, lineHeight: 20 },
    userCard: { backgroundColor: AppColors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: AppColors.border, marginBottom: 12 },
    userName: { fontSize: 17, fontWeight: '800', color: AppColors.text, marginBottom: 4 },
    userDetail: { fontSize: 14, color: AppColors.mutedText, marginBottom: 2 },
    actionRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
    approveButton: { flex: 1, height: 44, backgroundColor: AppColors.primary, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    approveText: { color: AppColors.card, fontWeight: '800', fontSize: 14 },
    rejectButton: { flex: 1, height: 44, borderWidth: 1, borderColor: AppColors.danger, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    rejectText: { color: AppColors.danger, fontWeight: '800', fontSize: 14 },
    refreshButton: { height: 44, borderRadius: 10, borderWidth: 1, borderColor: AppColors.border, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
    refreshText: { color: AppColors.mutedText, fontWeight: '700' },
    actionList: { gap: 12 },
    actionCard: { backgroundColor: AppColors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: AppColors.border },
    actionTitle: { fontSize: 16, fontWeight: '800', color: AppColors.primary, marginBottom: 4 },
    actionText: { fontSize: 14, color: AppColors.mutedText, lineHeight: 20 },
});
