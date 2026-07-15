import { AppColors } from '@/constants/colors';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/services/api';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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

type Announcement = { id: number; title: string; category: string; postedAt: string };

export default function RepPanel() {
    const { signOut, token } = useAuth();
    const [counts, setCounts] = useState({ announcements: 0, assignments: 0, classes: 0, examVenues: 0 });
    const [latestAnnouncement, setLatestAnnouncement] = useState<Announcement | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadOverview = useCallback(async () => {
        const [ann, asg, tt, ev] = await Promise.allSettled([
            apiRequest<Announcement[]>('/announcements', { token }),
            apiRequest<unknown[]>('/assignments', { token }),
            apiRequest<unknown[]>('/timetable', { token }),
            apiRequest<unknown[]>('/exam-venues', { token }),
        ]);
        setCounts({
            announcements: ann.status === 'fulfilled' ? ann.value.length : 0,
            assignments: asg.status === 'fulfilled' ? asg.value.length : 0,
            classes: tt.status === 'fulfilled' ? tt.value.length : 0,
            examVenues: ev.status === 'fulfilled' ? ev.value.length : 0,
        });
        if (ann.status === 'fulfilled') setLatestAnnouncement(ann.value[0] ?? null);
        setIsLoading(false);
        setRefreshing(false);
    }, [token]);

    useEffect(() => {
        loadOverview();
    }, [loadOverview]);

    const onRefresh = () => {
        setRefreshing(true);
        loadOverview();
    };

    const handleSignOut = async () => {
        await signOut();
        router.replace('/');
    };

    const metrics = [
        { label: 'Announcements', value: counts.announcements, context: 'posted to students' },
        { label: 'Assignments', value: counts.assignments, context: 'currently listed' },
        { label: 'Classes', value: counts.classes, context: 'in the timetable' },
        { label: 'Exam venues', value: counts.examVenues, context: 'ranges added' },
    ];

    const actions = [
        { title: 'Post Announcement', text: 'Share class updates, cancellations, and reminders.', route: '/post-announcement' },
        { title: 'Manage Timetable', text: 'Add or update class times, lecturers, and venues.', route: '/manage-timetable' },
        { title: 'Add Assignment', text: 'Record assignment details, due dates, and instructions.', route: '/add-assignment' },
        { title: 'Upload Exam Venue Info', text: 'Add exam venue ranges so students can search them.', route: '/manage-exam-venues' },
        { title: 'Upload Midsem Score', text: 'Post a student’s midsem score by index number.', route: '/upload-score' },
        { title: 'Profile & Settings', text: 'Manage reminders, sync, and account settings.', route: '/profile-settings' },
    ];

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
                        <Text style={styles.title}>Course Rep Panel</Text>
                        <Text style={styles.subtitle}>Manage academic updates for your class</Text>
                    </View>

                    <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                        <Text style={styles.signOutText}>Sign out</Text>
                    </TouchableOpacity>
                </View>

                {!isLoading && (
                    <View style={styles.statStrip}>
                        {metrics.map((metric) => (
                            <View key={metric.label} style={styles.statItem}>
                                <Text style={styles.statValue}>{metric.value}</Text>
                                <Text style={styles.statLabel}>{metric.label}</Text>
                            </View>
                        ))}
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Latest announcement</Text>
                    <TouchableOpacity style={styles.card} onPress={() => router.push('/announcements')}>
                        {latestAnnouncement ? (
                            <>
                                <Text style={styles.announcementCategory}>{latestAnnouncement.category}</Text>
                                <Text style={styles.announcementTitle}>{latestAnnouncement.title}</Text>
                                <Text style={styles.announcementMeta}>{latestAnnouncement.postedAt}</Text>
                            </>
                        ) : (
                            <>
                                <Text style={styles.emptyTitle}>Nothing posted yet</Text>
                                <Text style={styles.emptyText}>Your most recent announcement will show here.</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick actions</Text>
                    <View style={styles.actionList}>
                        {actions.map((action) => (
                            <TouchableOpacity
                                key={action.route}
                                style={styles.actionCard}
                                onPress={() => router.push(action.route as any)}
                            >
                                <Text style={styles.actionTitle}>{action.title}</Text>
                                <Text style={styles.actionText}>{action.text}</Text>
                            </TouchableOpacity>
                        ))}
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
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: AppColors.text,
    },
    subtitle: {
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
        paddingVertical: 40,
        alignItems: 'center',
    },
    statStrip: {
        flexDirection: 'row',
        backgroundColor: AppColors.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: AppColors.border,
        paddingVertical: 14,
        marginBottom: 22,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 18,
        fontWeight: '800',
        color: AppColors.text,
    },
    statLabel: {
        fontSize: 11,
        color: AppColors.mutedText,
        fontWeight: '600',
        marginTop: 3,
        textAlign: 'center',
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
