import { AppColors } from '@/constants/colors';
import { Fonts } from '@/constants/ui';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
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

type AuditEntry = {
    id: number;
    action: string;
    detail: string;
    actorName: string;
    actorRole: string;
    createdAtFormatted: string;
};

// Turns "ANNOUNCEMENT_POSTED" into "Announcement posted" for display.
function humanizeAction(action: string): string {
    const words = action.toLowerCase().replace(/_/g, ' ');
    return words.charAt(0).toUpperCase() + words.slice(1);
}

export default function AuditLogScreen() {
    const { token } = useAuth();
    const [entries, setEntries] = useState<AuditEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadLog = useCallback(async () => {
        try {
            setError(null);
            const data = await apiRequest<AuditEntry[]>('/admin/audit-logs', { token });
            setEntries(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unable to load the activity log.');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [token]);

    useEffect(() => {
        loadLog();
    }, [loadLog]);

    const onRefresh = () => {
        setRefreshing(true);
        loadLog();
    };

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
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
                    <Ionicons name="chevron-back" size={22} color={AppColors.text} />
                </TouchableOpacity>

                <Text style={styles.title}>Activity log</Text>
                <Text style={styles.subtitle}>Recent actions across the app — who did what and when.</Text>

                {isLoading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={AppColors.primary} />
                    </View>
                ) : error ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>Couldn&apos;t load the log</Text>
                        <Text style={styles.emptyText}>{error}</Text>
                        <TouchableOpacity style={styles.retryButton} onPress={loadLog}>
                            <Text style={styles.retryButtonText}>Try again</Text>
                        </TouchableOpacity>
                    </View>
                ) : entries.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>No activity yet</Text>
                        <Text style={styles.emptyText}>Actions like logins, posts, and rep changes will appear here.</Text>
                    </View>
                ) : (
                    entries.map((entry) => (
                        <View key={entry.id} style={styles.row}>
                            <View style={styles.rowHeader}>
                                <Text style={styles.action}>{humanizeAction(entry.action)}</Text>
                                <Text style={styles.time}>{entry.createdAtFormatted}</Text>
                            </View>
                            <Text style={styles.detail}>{entry.detail}</Text>
                            <Text style={styles.actor}>
                                {entry.actorName}
                                {entry.actorRole ? ` · ${entry.actorRole.toLowerCase()}` : ''}
                            </Text>
                        </View>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: AppColors.background },
    container: { flex: 1, backgroundColor: AppColors.background },
    content: { padding: 20, paddingBottom: 36 },
    backButton: {
        width: 40, height: 40, borderRadius: 12, backgroundColor: AppColors.card,
        borderWidth: 1, borderColor: AppColors.border, justifyContent: 'center', alignItems: 'center', marginBottom: 14,
    },
    title: { fontSize: 28, fontFamily: Fonts.heading, color: AppColors.text },
    subtitle: { fontSize: 14, color: AppColors.mutedText, marginTop: 6, marginBottom: 18, lineHeight: 20, fontFamily: Fonts.body },
    centered: { paddingVertical: 60, alignItems: 'center' },
    emptyCard: {
        backgroundColor: AppColors.card,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    emptyTitle: { fontSize: 18, fontFamily: Fonts.headingSemi, color: AppColors.text, marginBottom: 8 },
    emptyText: { fontSize: 14, color: AppColors.mutedText, lineHeight: 21, fontFamily: Fonts.body },
    retryButton: {
        height: 46,
        borderRadius: 12,
        backgroundColor: AppColors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
    },
    retryButtonText: { color: AppColors.card, fontSize: 15, fontFamily: Fonts.bodyBold },
    row: {
        backgroundColor: AppColors.card,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: AppColors.border,
        marginBottom: 10,
    },
    rowHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
        gap: 10,
    },
    action: { fontSize: 14, fontFamily: Fonts.bodyBold, color: AppColors.primary, flexShrink: 1 },
    time: { fontSize: 12, color: AppColors.mutedText, fontFamily: Fonts.body },
    detail: { fontSize: 14, color: AppColors.text, marginBottom: 4, fontFamily: Fonts.body },
    actor: { fontSize: 12, color: AppColors.mutedText, fontFamily: Fonts.bodyMedium },
});
