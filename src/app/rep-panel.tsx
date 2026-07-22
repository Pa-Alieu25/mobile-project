import { AppColors } from '@/constants/colors';
import { BottomNav } from '@/components/ui/bottom-nav';
import { Fonts } from '@/constants/ui';
import { useAuth } from '@/context/auth-context';
import { useSignOut } from '@/hooks/use-sign-out';
import { apiRequest } from '@/services/api';
import { getItem } from '@/services/storage';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
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

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type Announcement = { id: number; title: string; category: string; postedAt: string; postedByUserId?: number | null };

export default function RepPanel() {
    const { token } = useAuth();
    const handleSignOut = useSignOut();
    const [latestAnnouncement, setLatestAnnouncement] = useState<Announcement | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const loadOverview = useCallback(async () => {
        try {
            const announcements = await apiRequest<Announcement[]>('/announcements', { token });
            const uid = Number(await getItem('userId'));
            // Show the rep's own most recent post; fall back to the latest overall.
            const mine = announcements.filter((a) => a.postedByUserId != null && a.postedByUserId === uid);
            setLatestAnnouncement((mine[0] ?? announcements[0]) ?? null);
        } catch {
            // Leave the last known value; the card shows an empty state if none.
        } finally {
            setRefreshing(false);
        }
    }, [token]);

    // Reload whenever the panel gains focus so a newly posted announcement shows.
    useFocusEffect(
        useCallback(() => {
            loadOverview();
        }, [loadOverview])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadOverview();
    };

    // Icons reused from the Student Panel's own Quick actions grid, matched by
    // concept (announcements share a megaphone, assignments share a document).
    const actions: { title: string; icon: IconName; route: string }[] = [
        { title: 'Post Announcement', icon: 'megaphone-outline', route: '/post-announcement' },
        { title: 'View Announcements', icon: 'megaphone-outline', route: '/announcements' },
        { title: 'Add Assignment', icon: 'document-text-outline', route: '/add-assignment' },
        { title: 'View Assignments', icon: 'document-text-outline', route: '/assignments' },
        { title: 'Manage Timetable', icon: 'calendar-outline', route: '/manage-timetable' },
        { title: 'Upload Exam Venue Info', icon: 'search-outline', route: '/manage-exam-venues' },
        { title: 'Upload Midsem Score', icon: 'ribbon-outline', route: '/upload-score' },
        { title: 'Profile & Settings', icon: 'person-outline', route: '/profile-settings' },
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
                    <View style={styles.grid}>
                        {actions.map((action) => (
                            <TouchableOpacity
                                key={action.route}
                                style={styles.gridItem}
                                onPress={() => router.push(action.route as any)}
                            >
                                <View style={styles.gridIcon}>
                                    <Ionicons name={action.icon} size={22} color={AppColors.primary} />
                                </View>
                                <Text style={styles.gridLabel}>{action.title}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </ScrollView>

            <BottomNav active="home" />
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
        fontFamily: Fonts.heading,
        color: AppColors.text,
    },
    subtitle: {
        fontSize: 14,
        color: AppColors.mutedText,
        marginTop: 4,
        fontFamily: Fonts.body,
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
        fontFamily: Fonts.bodyMedium,
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
        fontFamily: Fonts.bodyBold,
        color: AppColors.text,
    },
    statLabel: {
        fontSize: 11,
        color: AppColors.mutedText,
        fontFamily: Fonts.bodyMedium,
        marginTop: 3,
        textAlign: 'center',
    },
    section: {
        marginBottom: 22,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: Fonts.headingSemi,
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
        fontFamily: Fonts.bodyBold,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 8,
    },
    announcementTitle: {
        fontSize: 16,
        fontFamily: Fonts.headingSemi,
        color: AppColors.text,
        marginBottom: 6,
    },
    announcementMeta: {
        fontSize: 13,
        color: AppColors.mutedText,
        fontFamily: Fonts.body,
    },
    emptyTitle: {
        fontSize: 16,
        fontFamily: Fonts.bodyBold,
        color: AppColors.text,
        marginBottom: 6,
    },
    emptyText: {
        fontSize: 14,
        color: AppColors.mutedText,
        lineHeight: 20,
        fontFamily: Fonts.body,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    gridItem: {
        flexBasis: '31%', flexGrow: 1, backgroundColor: AppColors.card, borderRadius: 14,
        paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: AppColors.border,
    },
    gridIcon: {
        width: 44, height: 44, borderRadius: 14, backgroundColor: AppColors.primary + '14',
        justifyContent: 'center', alignItems: 'center', marginBottom: 8,
    },
    gridLabel: { fontSize: 12, fontFamily: Fonts.bodyMedium, color: AppColors.text, textAlign: 'center' },
});
