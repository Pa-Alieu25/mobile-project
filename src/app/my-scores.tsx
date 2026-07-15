import { AppColors } from '@/constants/colors';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/services/api';
import { notifyNewScores } from '@/services/notifications';
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

type MidsemScore = {
    id: number;
    courseCode: string;
    courseTitle: string;
    score: string;
    grade: string;
    uploadedBy: string;
    uploadedAtFormatted: string;
};

export default function MyScoresScreen() {
    const { token } = useAuth();
    const [scores, setScores] = useState<MidsemScore[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadScores = useCallback(async () => {
        try {
            setError(null);
            const data = await apiRequest<MidsemScore[]>('/scores/me', { token });
            setScores(data);
            // Alert the student about any score they haven't seen before.
            await notifyNewScores(data.map((s) => ({ id: s.id, courseCode: s.courseCode })));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unable to load your scores.');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [token]);

    useEffect(() => {
        loadScores();
    }, [loadScores]);

    const onRefresh = () => {
        setRefreshing(true);
        loadScores();
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
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>

                <Text style={styles.title}>Midsem Scores</Text>
                <Text style={styles.subtitle}>Your released midsemester scores, matched to your index number.</Text>

                {isLoading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={AppColors.primary} />
                    </View>
                ) : error ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>Couldn&apos;t load your scores</Text>
                        <Text style={styles.emptyText}>{error}</Text>
                        <TouchableOpacity style={styles.retryButton} onPress={loadScores}>
                            <Text style={styles.retryButtonText}>Try again</Text>
                        </TouchableOpacity>
                    </View>
                ) : scores.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>No scores yet</Text>
                        <Text style={styles.emptyText}>
                            When your course rep uploads midsem scores for your index number, they appear here.
                        </Text>
                    </View>
                ) : (
                    scores.map((s) => (
                        <View key={s.id} style={styles.scoreCard}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.courseCode}>{s.courseCode}</Text>
                                <Text style={styles.gradeBadge}>{s.grade}</Text>
                            </View>
                            <Text style={styles.courseTitle}>{s.courseTitle}</Text>

                            <View style={styles.scoreRow}>
                                <Text style={styles.scoreLabel}>Score</Text>
                                <Text style={styles.scoreValue}>{s.score}</Text>
                            </View>

                            <Text style={styles.meta}>Uploaded by {s.uploadedBy} · {s.uploadedAtFormatted}</Text>
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
    backText: { color: AppColors.primary, fontSize: 15, fontWeight: '700', marginBottom: 14 },
    title: { fontSize: 28, fontWeight: '900', color: AppColors.text },
    subtitle: { fontSize: 14, color: AppColors.mutedText, marginTop: 6, marginBottom: 18, lineHeight: 20 },
    centered: { paddingVertical: 60, alignItems: 'center' },
    emptyCard: {
        backgroundColor: AppColors.card,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: AppColors.text, marginBottom: 8 },
    emptyText: { fontSize: 14, color: AppColors.mutedText, lineHeight: 21 },
    retryButton: {
        height: 46,
        borderRadius: 12,
        backgroundColor: AppColors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
    },
    retryButtonText: { color: AppColors.card, fontSize: 15, fontWeight: '800' },
    scoreCard: {
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
        marginBottom: 8,
        gap: 10,
    },
    courseCode: { color: AppColors.primary, fontSize: 13, fontWeight: '900' },
    gradeBadge: {
        backgroundColor: AppColors.primary,
        color: AppColors.card,
        fontSize: 13,
        fontWeight: '900',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 999,
        overflow: 'hidden',
    },
    courseTitle: { color: AppColors.text, fontSize: 17, fontWeight: '800', marginBottom: 12 },
    scoreRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: AppColors.background,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: AppColors.border,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 12,
    },
    scoreLabel: { fontSize: 13, color: AppColors.mutedText, fontWeight: '700' },
    scoreValue: { fontSize: 18, color: AppColors.text, fontWeight: '900' },
    meta: { fontSize: 12, color: AppColors.mutedText, fontWeight: '600' },
});
