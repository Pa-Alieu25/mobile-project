import { AppColors } from '@/constants/colors';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/services/api';
import { getItem } from '@/services/storage';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Rep = {
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
    const [reps, setReps] = useState<Rep[]>([]);
    const [counts, setCounts] = useState({ announcements: 0, assignments: 0, classes: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [repIdentifier, setRepIdentifier] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchReps = useCallback(async () => {
        try {
            const data = await apiRequest<Rep[]>('/admin/reps', { token });
            setReps(data);
        } catch (error) {
            console.error('Failed to fetch reps', error);
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
        await fetchReps();
        setIsLoading(false);
    }, [token, fetchReps]);

    useEffect(() => {
        (async () => {
            const name = await getItem('userName');
            if (name) setAdminName(name);
            loadOverview();
        })();
    }, [loadOverview]);

    const handleMakeRep = async () => {
        const identifier = repIdentifier.trim();
        if (!identifier) {
            Alert.alert('Enter an index number', "Type the student's index number or email to make them a course rep.");
            return;
        }
        try {
            setIsSubmitting(true);
            const rep = await apiRequest<Rep>('/admin/make-rep', {
                method: 'POST',
                token,
                body: { identifier },
            });
            Alert.alert('Course rep added', `${rep.fullName} is now a course rep.`);
            setRepIdentifier('');
            fetchReps();
        } catch (e) {
            Alert.alert('Could not add rep', e instanceof Error ? e.message : 'Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveRep = (rep: Rep) => {
        Alert.alert('Remove course rep?', `${rep.fullName} will go back to a normal student account.`, [
            { text: 'Keep', style: 'cancel' },
            {
                text: 'Remove',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await apiRequest(`/admin/remove-rep/${rep.id}`, { method: 'POST', token });
                        fetchReps();
                    } catch (e) {
                        Alert.alert('Could not remove', e instanceof Error ? e.message : 'Please try again.');
                    }
                },
            },
        ]);
    };

    const handleSignOut = async () => {
        await signOut();
        router.replace('/');
    };

    const metrics = [
        { label: 'Course reps', value: reps.length, context: reps.length === 1 ? 'active' : 'active' },
        { label: 'Announcements', value: counts.announcements, context: 'posted' },
        { label: 'Assignments', value: counts.assignments, context: 'listed' },
        { label: 'Classes', value: counts.classes, context: 'in timetable' },
    ];

    const tools = [
        { title: 'Post Announcement', text: 'Share class updates and cancellations.', route: '/post-announcement' },
        { title: 'Manage Timetable', text: 'Add, cancel, or remove classes.', route: '/manage-timetable' },
        { title: 'Add Assignment', text: 'Record assignment details and due dates.', route: '/add-assignment' },
        { title: 'Upload Exam Venue Info', text: 'Add exam venue ranges for students.', route: '/manage-exam-venues' },
        { title: 'Upload Midsem Score', text: 'Post a student’s midsem score by index number.', route: '/upload-score' },
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
                    <Text style={styles.sectionTitle}>Make a course rep</Text>
                    <Text style={styles.helperText}>
                        The person registers as a student first, then you enter their index number or email here to
                        make them a course rep.
                    </Text>
                    <View style={styles.formCard}>
                        <TextInput
                            style={styles.input}
                            placeholder="Student index number or email"
                            placeholderTextColor={AppColors.mutedText}
                            value={repIdentifier}
                            onChangeText={setRepIdentifier}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <TouchableOpacity
                            style={[styles.primaryButton, isSubmitting && styles.disabledButton]}
                            onPress={handleMakeRep}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color={AppColors.card} />
                            ) : (
                                <Text style={styles.primaryButtonText}>Make course rep</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Current course reps ({reps.length})</Text>
                    {reps.length === 0 ? (
                        <Text style={styles.helperText}>No course reps yet.</Text>
                    ) : (
                        reps.map((rep) => (
                            <View key={rep.id} style={styles.repCard}>
                                <Text style={styles.repName}>{rep.fullName}</Text>
                                <Text style={styles.repDetail}>{rep.email}</Text>
                                <Text style={styles.repDetail}>Index: {rep.indexNumber}</Text>
                                <Text style={styles.repDetail}>{rep.programme} — Level {rep.level}</Text>
                                <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveRep(rep)}>
                                    <Text style={styles.removeButtonText}>Remove rep</Text>
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
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
    helperText: { fontSize: 14, color: AppColors.mutedText, lineHeight: 20, marginBottom: 12 },
    formCard: { backgroundColor: AppColors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: AppColors.border },
    input: { height: 52, borderWidth: 1, borderColor: AppColors.border, borderRadius: 12, paddingHorizontal: 14, marginBottom: 14, fontSize: 15, color: AppColors.text, backgroundColor: AppColors.background },
    primaryButton: { height: 50, borderRadius: 12, backgroundColor: AppColors.primary, justifyContent: 'center', alignItems: 'center' },
    disabledButton: { backgroundColor: AppColors.primaryDark },
    primaryButtonText: { color: AppColors.card, fontWeight: '800', fontSize: 15 },
    repCard: { backgroundColor: AppColors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: AppColors.border, marginBottom: 12 },
    repName: { fontSize: 17, fontWeight: '800', color: AppColors.text, marginBottom: 4 },
    repDetail: { fontSize: 14, color: AppColors.mutedText, marginBottom: 2 },
    removeButton: { marginTop: 12, height: 42, borderRadius: 10, borderWidth: 1, borderColor: AppColors.danger, justifyContent: 'center', alignItems: 'center' },
    removeButtonText: { color: AppColors.danger, fontWeight: '800', fontSize: 14 },
    actionList: { gap: 12 },
    actionCard: { backgroundColor: AppColors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: AppColors.border },
    actionTitle: { fontSize: 16, fontWeight: '800', color: AppColors.primary, marginBottom: 4 },
    actionText: { fontSize: 14, color: AppColors.mutedText, lineHeight: 20 },
});
