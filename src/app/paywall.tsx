import { AppColors } from '@/constants/colors';
import {
    activatePro,
    cancelPro,
    getSubscription,
    PRO_PRICE_GHS,
    type SubscriptionStatus,
} from '@/services/subscription';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const freeFeatures = [
    'Timetable with offline access',
    'Announcements and assignments',
    'Exam venue search',
    'Google Maps navigation',
    'Class reminders',
];

const proFeatures = [
    'Alarm-mode alerts that ring even on silent',
    'Priority notifications pinned to the top',
    'Night-before summary of tomorrow',
    'Custom reminder intensity per alert type',
];

export default function PaywallScreen() {
    const [status, setStatus] = useState<SubscriptionStatus | null>(null);
    const [isWorking, setIsWorking] = useState(false);

    const load = async () => setStatus(await getSubscription());

    useEffect(() => {
        load();
    }, []);

    const handleSubscribe = () => {
        Alert.alert(
            'Subscribe to Pro',
            `Live Paystack payment (Mobile Money or card) will be added for production. Activate Pro now for GHS ${PRO_PRICE_GHS}/semester?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Activate',
                    onPress: async () => {
                        setIsWorking(true);
                        await activatePro();
                        await load();
                        setIsWorking(false);
                    },
                },
            ]
        );
    };

    const handleCancel = () => {
        Alert.alert('Cancel Pro', 'Turn off your Pro subscription?', [
            { text: 'Keep Pro', style: 'cancel' },
            {
                text: 'Cancel Pro',
                style: 'destructive',
                onPress: async () => {
                    setIsWorking(true);
                    await cancelPro();
                    await load();
                    setIsWorking(false);
                },
            },
        ]);
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>

                <Text style={styles.title}>ClassMate Pro</Text>
                <Text style={styles.subtitle}>Keep the advanced reminders after your free semester.</Text>

                {!status ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={AppColors.primary} />
                    </View>
                ) : (
                    <>
                        <View style={styles.statusCard}>
                            {status.subscribed ? (
                                <>
                                    <Text style={styles.statusLabel}>Your plan</Text>
                                    <Text style={styles.statusValue}>Pro — active</Text>
                                    <Text style={styles.statusHint}>You have all Pro features.</Text>
                                </>
                            ) : status.inFreePeriod ? (
                                <>
                                    <Text style={styles.statusLabel}>Free semester</Text>
                                    <Text style={styles.statusValue}>{status.daysLeftInFree} days left</Text>
                                    <Text style={styles.statusHint}>
                                        All Pro features are unlocked free until your first semester ends.
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <Text style={styles.statusLabel}>Free tier</Text>
                                    <Text style={styles.statusValue}>Pro features locked</Text>
                                    <Text style={styles.statusHint}>
                                        Your free semester has ended. Subscribe to unlock Pro features again.
                                    </Text>
                                </>
                            )}
                        </View>

                        <Text style={styles.sectionTitle}>Always free</Text>
                        <View style={styles.card}>
                            {freeFeatures.map((f) => (
                                <View key={f} style={styles.featureRow}>
                                    <Text style={styles.check}>✓</Text>
                                    <Text style={styles.featureText}>{f}</Text>
                                </View>
                            ))}
                        </View>

                        <Text style={styles.sectionTitle}>Pro — GHS {PRO_PRICE_GHS} / semester</Text>
                        <View style={styles.card}>
                            {proFeatures.map((f) => (
                                <View key={f} style={styles.featureRow}>
                                    <Text style={styles.star}>★</Text>
                                    <Text style={styles.featureText}>{f}</Text>
                                </View>
                            ))}
                        </View>

                        {status.subscribed ? (
                            <TouchableOpacity
                                style={[styles.secondaryButton, isWorking && styles.disabled]}
                                onPress={handleCancel}
                                disabled={isWorking}
                            >
                                <Text style={styles.secondaryButtonText}>Cancel subscription</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={[styles.primaryButton, isWorking && styles.disabled]}
                                onPress={handleSubscribe}
                                disabled={isWorking}
                            >
                                {isWorking ? (
                                    <ActivityIndicator color={AppColors.card} />
                                ) : (
                                    <Text style={styles.primaryButtonText}>
                                        {status.inFreePeriod ? 'Subscribe to keep Pro' : 'Subscribe to Pro'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        )}

                        <Text style={styles.footnote}>
                            Payment via Paystack (Mobile Money and card) is added in the production build. No
                            automatic renewal — you re-subscribe each semester.
                        </Text>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: AppColors.background },
    content: { padding: 20, paddingBottom: 40 },
    backText: { color: AppColors.primary, fontSize: 15, fontWeight: '700', marginBottom: 14 },
    title: { fontSize: 28, fontWeight: '900', color: AppColors.text },
    subtitle: { fontSize: 14, color: AppColors.mutedText, marginTop: 6, marginBottom: 20, lineHeight: 20 },
    centered: { paddingVertical: 60, alignItems: 'center' },
    statusCard: {
        backgroundColor: AppColors.primary,
        borderRadius: 18,
        padding: 18,
        marginBottom: 22,
    },
    statusLabel: { color: AppColors.accent, fontSize: 13, fontWeight: '800', marginBottom: 6 },
    statusValue: { color: AppColors.card, fontSize: 22, fontWeight: '900', marginBottom: 6 },
    statusHint: { color: AppColors.card, fontSize: 14, lineHeight: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: AppColors.text, marginBottom: 10 },
    card: {
        backgroundColor: AppColors.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: AppColors.border,
        marginBottom: 22,
    },
    featureRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6, gap: 10 },
    check: { color: AppColors.success, fontSize: 16, fontWeight: '900', width: 18 },
    star: { color: AppColors.accent, fontSize: 16, fontWeight: '900', width: 18 },
    featureText: { flex: 1, fontSize: 14, color: AppColors.text, lineHeight: 20 },
    primaryButton: {
        height: 52,
        backgroundColor: AppColors.primary,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    primaryButtonText: { color: AppColors.card, fontSize: 16, fontWeight: '800' },
    secondaryButton: {
        height: 52,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: AppColors.danger,
        justifyContent: 'center',
        alignItems: 'center',
    },
    secondaryButtonText: { color: AppColors.danger, fontSize: 16, fontWeight: '800' },
    disabled: { opacity: 0.6 },
    footnote: { fontSize: 12, color: AppColors.mutedText, lineHeight: 18, marginTop: 14, textAlign: 'center' },
});
