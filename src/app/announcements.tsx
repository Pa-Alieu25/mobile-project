import { OfflineBanner } from '@/components/offline-banner';
import { BottomNav } from '@/components/ui/bottom-nav';
import { AppColors } from '@/constants/colors';
import { Fonts, cardShadow } from '@/constants/ui';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/services/api';
import { CacheKeys, fetchWithCache, writeCache } from '@/services/cache';
import { getItem } from '@/services/storage';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
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

type Announcement = {
    id: number;
    title: string;
    message: string;
    category: string;
    targetClassGroup: string;
    postedBy: string;
    postedByUserId?: number | null;
    postedAt: string;
    read: boolean;
};

const filterCategories = [
    'All',
    'General',
    'Class Update',
    'Venue Change',
    'Assignment',
    'Exam',
];

// Icon + accent colour for each announcement category.
function categoryStyle(category: string): { icon: keyof typeof Ionicons.glyphMap; color: string } {
    switch (category) {
        case 'Class Update': return { icon: 'sync-outline', color: AppColors.statusTimeChanged };
        case 'Venue Change': return { icon: 'location-outline', color: AppColors.statusVenueChanged };
        case 'Assignment': return { icon: 'document-text-outline', color: AppColors.accent };
        case 'Exam': return { icon: 'school-outline', color: AppColors.danger };
        default: return { icon: 'megaphone-outline', color: AppColors.primary };
    }
}

export default function AnnouncementsScreen() {
    const { token, role } = useAuth();
    const isManager = role === 'course_rep' || role === 'admin';
    const [activeFilter, setActiveFilter] = useState<string>('All');
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [flash, setFlash] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isOffline, setIsOffline] = useState(false);

    const loadAnnouncements = useCallback(async () => {
        try {
            setError(null);
            const { data, fromCache } = await fetchWithCache<Announcement[]>(
                CacheKeys.announcements, '/announcements', token
            );
            setAnnouncements(data);
            setIsOffline(fromCache);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unable to load announcements.');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [token]);

    // Reload on focus so newly posted / deleted announcements show when returning.
    useFocusEffect(
        useCallback(() => {
            loadAnnouncements();
        }, [loadAnnouncements])
    );

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

    const canManage = (a: Announcement) =>
        role === 'admin' || (role === 'course_rep' && a.postedByUserId != null && a.postedByUserId === currentUserId);

    const confirmDelete = (a: Announcement) => {
        Alert.alert(
            'Delete this announcement?',
            'Students will no longer be able to view it. This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => handleDelete(a) },
            ]
        );
    };

    const handleDelete = async (a: Announcement) => {
        try {
            await apiRequest(`/announcements/${a.id}`, { method: 'DELETE', token });
            const next = announcements.filter((item) => item.id !== a.id);
            setAnnouncements(next);
            await writeCache(CacheKeys.announcements, next); // keep offline cache in sync
            showFlash('Announcement deleted.');
        } catch (e) {
            Alert.alert('Could not delete', e instanceof Error ? e.message : 'The announcement is still there. Please try again.');
        }
    };

    const filteredAnnouncements = useMemo(() => {
        if (activeFilter === 'All') return announcements;
        return announcements.filter((a) => a.category === activeFilter);
    }, [activeFilter, announcements]);

    const onRefresh = () => {
        setRefreshing(true);
        loadAnnouncements();
    };

    // Persisted per-student on the backend (keyed to the signed-in user's id),
    // so read status survives sign-out/sign-in and does not affect other students.
    async function handleMarkAsRead(announcementId: number) {
        const next = announcements.map((a) => (a.id === announcementId ? { ...a, read: true } : a));
        setAnnouncements(next);
        await writeCache(CacheKeys.announcements, next);
        try {
            await apiRequest(`/announcements/${announcementId}/read`, { method: 'PUT', token });
        } catch (e) {
            setAnnouncements(announcements);
            await writeCache(CacheKeys.announcements, announcements);
            Alert.alert('Could not update', e instanceof Error ? e.message : 'Please try again.');
        }
    }

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

                <Text style={styles.title}>Announcements</Text>
                <Text style={styles.subtitle}>
                    Class updates posted by your course reps.
                </Text>

                {isOffline && <OfflineBanner />}

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterContent}
                    style={styles.filterScroll}
                >
                    {filterCategories.map((category) => (
                        <TouchableOpacity
                            key={category}
                            style={[
                                styles.filterChip,
                                activeFilter === category && styles.activeFilterChip,
                            ]}
                            onPress={() => setActiveFilter(category)}
                        >
                            <Text
                                style={[
                                    styles.filterText,
                                    activeFilter === category && styles.activeFilterText,
                                ]}
                            >
                                {category}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

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
                        <Text style={styles.emptyTitle}>Couldn&apos;t load announcements</Text>
                        <Text style={styles.emptyText}>{error}</Text>
                        <TouchableOpacity style={styles.readButton} onPress={loadAnnouncements}>
                            <Text style={styles.readButtonText}>Try again</Text>
                        </TouchableOpacity>
                    </View>
                ) : filteredAnnouncements.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Ionicons name="megaphone-outline" size={30} color={AppColors.mutedText} />
                        <Text style={styles.emptyTitle}>
                            {activeFilter === 'All'
                                ? 'No announcements yet'
                                : `No ${activeFilter.toLowerCase()} announcements`}
                        </Text>
                        <Text style={styles.emptyText}>
                            When a course rep posts an update it will appear here. Pull down to refresh.
                        </Text>
                    </View>
                ) : (
                    filteredAnnouncements.map((announcement) => {
                        const isRead = announcement.read;
                        const cat = categoryStyle(announcement.category);
                        return (
                            <View
                                key={announcement.id}
                                style={[styles.announcementCard, cardShadow, !isRead && styles.unreadCard]}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={[styles.iconBadge, { backgroundColor: cat.color + '1A' }]}>
                                        <Ionicons name={cat.icon} size={18} color={cat.color} />
                                    </View>
                                    <Text style={[styles.category, { color: cat.color }]}>{announcement.category}</Text>

                                    {!isRead && (
                                        <View style={styles.unreadBadge}>
                                            <Text style={styles.unreadBadgeText}>Unread</Text>
                                        </View>
                                    )}
                                    {canManage(announcement) && (
                                        <TouchableOpacity onPress={() => confirmDelete(announcement)} hitSlop={8} style={styles.menuButton}>
                                            <Ionicons name="ellipsis-vertical" size={18} color={AppColors.mutedText} />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                <Text style={styles.announcementTitle}>{announcement.title}</Text>
                                <Text style={styles.message}>{announcement.message}</Text>

                                <View style={styles.targetBox}>
                                    <Ionicons name="people-outline" size={15} color={AppColors.mutedText} />
                                    <View style={styles.targetTextWrap}>
                                        <Text style={styles.targetLabel}>Target group</Text>
                                        <Text style={styles.targetText}>{announcement.targetClassGroup}</Text>
                                    </View>
                                </View>

                                {!isRead && (
                                    <TouchableOpacity
                                        style={styles.readButton}
                                        onPress={() => handleMarkAsRead(announcement.id)}
                                    >
                                        <Ionicons name="checkmark" size={17} color={AppColors.card} />
                                        <Text style={styles.readButtonText}>Mark as read</Text>
                                    </TouchableOpacity>
                                )}

                                <View style={styles.footer}>
                                    <View style={styles.footerMeta}>
                                        <Ionicons name="person-circle-outline" size={15} color={AppColors.mutedText} />
                                        <Text style={styles.footerText}>{announcement.postedBy}</Text>
                                    </View>
                                    <Text style={styles.footerText}>{announcement.postedAt}</Text>
                                </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>

            <BottomNav active="alerts" />
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
    filterScroll: {
        marginBottom: 16,
    },
    filterContent: {
        gap: 10,
        paddingRight: 4,
    },
    filterChip: {
        backgroundColor: AppColors.card,
        borderWidth: 1,
        borderColor: AppColors.border,
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 9,
    },
    activeFilterChip: {
        backgroundColor: AppColors.primary,
        borderColor: AppColors.primary,
    },
    filterText: {
        color: AppColors.mutedText,
        fontSize: 13,
        fontFamily: Fonts.bodyBold,
    },
    activeFilterText: {
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
    announcementCard: {
        backgroundColor: AppColors.card,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: AppColors.border,
        marginBottom: 14,
    },
    unreadCard: {
        borderColor: AppColors.primary,
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
    iconBadge: {
        width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center',
    },
    category: {
        flex: 1,
        fontSize: 13,
        fontFamily: Fonts.bodyBold,
    },
    unreadBadge: {
        backgroundColor: AppColors.primary,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
    },
    unreadBadgeText: {
        color: AppColors.card,
        fontSize: 11,
        fontFamily: Fonts.bodyBold,
        textTransform: 'uppercase',
    },
    announcementTitle: {
        fontSize: 18,
        fontFamily: Fonts.headingSemi,
        color: AppColors.text,
        marginBottom: 6,
    },
    message: {
        fontSize: 14,
        color: AppColors.mutedText,
        lineHeight: 21,
        fontFamily: Fonts.body,
    },
    targetBox: {
        backgroundColor: AppColors.background,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: AppColors.border,
        padding: 12,
        marginTop: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    targetTextWrap: {
        flex: 1,
    },
    targetLabel: {
        fontSize: 12,
        color: AppColors.mutedText,
        fontFamily: Fonts.bodyMedium,
        marginBottom: 2,
    },
    targetText: {
        fontSize: 14,
        color: AppColors.text,
        fontFamily: Fonts.bodyBold,
    },
    readButton: {
        height: 46,
        borderRadius: 12,
        backgroundColor: AppColors.primary,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 7,
        marginTop: 12,
    },
    readButtonText: {
        color: AppColors.card,
        fontSize: 15,
        fontFamily: Fonts.bodyBold,
    },
    footer: {
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: AppColors.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
    },
    footerMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        flex: 1,
    },
    footerText: {
        fontSize: 12,
        color: AppColors.mutedText,
        fontFamily: Fonts.bodyMedium,
    },
});
