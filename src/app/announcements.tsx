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

type Announcement = {
    id: number;
    title: string;
    message: string;
    category: 'General' | 'Class Update' | 'Venue Change' | 'Assignment' | 'Exam';
    postedBy: string;
    postedAt: string;
};

const announcements: Announcement[] = [];

export default function AnnouncementsScreen() {
    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text style={styles.backText}>Back</Text>
                    </TouchableOpacity>

                    <Text style={styles.title}>Announcements</Text>
                    <Text style={styles.subtitle}>
                        View important class updates from course reps.
                    </Text>
                </View>

                {announcements.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>No announcements yet</Text>
                        <Text style={styles.emptyText}>
                            Announcements posted by course reps will appear here. This keeps
                            students updated without depending only on WhatsApp messages.
                        </Text>
                    </View>
                ) : (
                    announcements.map((announcement) => (
                        <View key={announcement.id} style={styles.announcementCard}>
                            <Text style={styles.category}>{announcement.category}</Text>
                            <Text style={styles.announcementTitle}>{announcement.title}</Text>
                            <Text style={styles.message}>{announcement.message}</Text>

                            <View style={styles.footer}>
                                <Text style={styles.footerText}>{announcement.postedBy}</Text>
                                <Text style={styles.footerText}>{announcement.postedAt}</Text>
                            </View>
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
    header: {
        marginBottom: 22,
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
    announcementCard: {
        backgroundColor: AppColors.card,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: AppColors.border,
        marginBottom: 14,
    },
    category: {
        alignSelf: 'flex-start',
        backgroundColor: AppColors.background,
        color: AppColors.primary,
        fontSize: 12,
        fontWeight: '800',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 14,
        marginBottom: 10,
    },
    announcementTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: AppColors.text,
        marginBottom: 6,
    },
    message: {
        fontSize: 14,
        color: AppColors.mutedText,
        lineHeight: 21,
    },
    footer: {
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: AppColors.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    footerText: {
        fontSize: 12,
        color: AppColors.mutedText,
        fontWeight: '600',
    },
});