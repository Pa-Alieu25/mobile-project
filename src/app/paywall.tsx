import { AppColors } from '@/constants/colors';
import { Fonts } from '@/constants/ui';
import { useAuth } from '@/context/auth-context';
import { initializePayment, verifyPayment, type PaymentStatus } from '@/services/payment';
import { Ionicons } from '@expo/vector-icons';
import {
    activatePro,
    cancelPro,
    getSubscription,
    PRO_PRICE_GHS,
    type SubscriptionStatus,
} from '@/services/subscription';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
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

// The webhook may still be in flight when the browser closes, so a fresh
// PENDING result isn't a failure — poll verify a few times before giving up.
const MAX_POLL_ATTEMPTS = 5;
const POLL_DELAY_MS = 2500;

function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function PaywallScreen() {
    const { token } = useAuth();
    const [status, setStatus] = useState<SubscriptionStatus | null>(null);
    const [isWorking, setIsWorking] = useState(false);
    const [confirmingMessage, setConfirmingMessage] = useState<string | null>(null);

    const load = async () => setStatus(await getSubscription());

    useEffect(() => {
        load();
    }, []);

    // Polls our backend's verify endpoint — the only source of truth for
    // whether the payment actually succeeded. Never trusts the browser
    // closing, or anything the client observed on its own, as proof of payment.
    const confirmPayment = async (reference: string) => {
        setConfirmingMessage('Confirming your payment…');

        let lastStatus: PaymentStatus = 'PENDING';
        for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
            try {
                const result = await verifyPayment(reference, token);
                lastStatus = result.status;

                if (result.status === 'SUCCESS') {
                    await activatePro();
                    await load();
                    setConfirmingMessage(null);
                    setIsWorking(false);
                    Alert.alert('Payment successful', 'You now have ClassMate Pro.');
                    return;
                }

                if (result.status === 'FAILED' || result.status === 'ABANDONED') {
                    setConfirmingMessage(null);
                    setIsWorking(false);
                    Alert.alert('Payment not completed', 'Your payment was not successful. You can try again.');
                    return;
                }
            } catch {
                // Network hiccup mid-poll — fall through and retry on the next attempt.
            }
            if (attempt < MAX_POLL_ATTEMPTS - 1) {
                await wait(POLL_DELAY_MS);
            }
        }

        // Exhausted our attempts and it's still pending — not an error, the
        // webhook may just be slow. Pro will unlock next time the user checks.
        setConfirmingMessage(null);
        setIsWorking(false);
        if (lastStatus === 'PENDING') {
            Alert.alert(
                "We'll confirm shortly",
                "Your payment is still being confirmed. Check back in a minute — Pro unlocks automatically once it's done."
            );
        }
    };

    const handleSubscribe = async () => {
        console.log('[pay] handleSubscribe pressed, isWorking =', isWorking, 'token present =', !!token);
        if (isWorking) return; // guards against a double-tap starting two transactions
        try {
            setIsWorking(true);
            console.log('[pay] calling initializePayment...');
            const { authorizationUrl, reference } = await initializePayment(PRO_PRICE_GHS * 100, token);
            console.log('[pay] initializePayment succeeded, reference =', reference, 'authorizationUrl =', authorizationUrl);

            await WebBrowser.openBrowserAsync(authorizationUrl);
            console.log('[pay] browser closed, confirming payment...');
            // The browser closing tells us nothing — the user may have paid,
            // cancelled, or just backgrounded the app. Only our backend's
            // verify response (backed by its own Paystack check) decides this.
            await confirmPayment(reference);
        } catch (e) {
            console.log('[pay] handleSubscribe FAILED:', e);
            setIsWorking(false);
            Alert.alert('Could not start checkout', e instanceof Error ? e.message : 'Please try again.');
        }
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
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
                    <Ionicons name="chevron-back" size={22} color={AppColors.text} />
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

                        {confirmingMessage && (
                            <View style={styles.confirmingRow}>
                                <ActivityIndicator size="small" color={AppColors.primary} />
                                <Text style={styles.confirmingText}>{confirmingMessage}</Text>
                            </View>
                        )}

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
                            Secure payment by Paystack (Mobile Money and card). Use a Paystack test card in
                            development — no real charge. No automatic renewal — you re-subscribe each semester.
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
    backButton: {
        width: 40, height: 40, borderRadius: 12, backgroundColor: AppColors.card,
        borderWidth: 1, borderColor: AppColors.border, justifyContent: 'center', alignItems: 'center', marginBottom: 14,
    },
    title: { fontSize: 28, fontFamily: Fonts.heading, color: AppColors.text },
    subtitle: { fontSize: 14, color: AppColors.mutedText, marginTop: 6, marginBottom: 20, lineHeight: 20, fontFamily: Fonts.body },
    centered: { paddingVertical: 60, alignItems: 'center' },
    statusCard: {
        backgroundColor: AppColors.primary,
        borderRadius: 18,
        padding: 18,
        marginBottom: 22,
    },
    statusLabel: { color: AppColors.accent, fontSize: 13, fontFamily: Fonts.bodyBold, marginBottom: 6 },
    statusValue: { color: AppColors.card, fontSize: 22, fontFamily: Fonts.heading, marginBottom: 6 },
    statusHint: { color: AppColors.card, fontSize: 14, lineHeight: 20, fontFamily: Fonts.body },
    sectionTitle: { fontSize: 16, fontFamily: Fonts.headingSemi, color: AppColors.text, marginBottom: 10 },
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
    featureText: { flex: 1, fontSize: 14, color: AppColors.text, lineHeight: 20, fontFamily: Fonts.body },
    confirmingRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: AppColors.card, borderRadius: 14, borderWidth: 1, borderColor: AppColors.border,
        padding: 14, marginBottom: 16,
    },
    confirmingText: { fontSize: 13, color: AppColors.mutedText, fontFamily: Fonts.bodyMedium, flex: 1 },
    primaryButton: {
        height: 52,
        backgroundColor: AppColors.primary,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    primaryButtonText: { color: AppColors.card, fontSize: 16, fontFamily: Fonts.bodyBold },
    secondaryButton: {
        height: 52,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: AppColors.danger,
        justifyContent: 'center',
        alignItems: 'center',
    },
    secondaryButtonText: { color: AppColors.danger, fontSize: 16, fontFamily: Fonts.bodyBold },
    disabled: { opacity: 0.6 },
    footnote: { fontSize: 12, color: AppColors.mutedText, lineHeight: 18, marginTop: 14, textAlign: 'center', fontFamily: Fonts.body },
});
