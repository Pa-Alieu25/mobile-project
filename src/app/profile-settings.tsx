import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { BottomNav } from '../components/ui/bottom-nav';
import { AppColors } from '../constants/colors';
import { Fonts } from '../constants/ui';
import { useAuth } from '../context/auth-context';
import { useSignOut } from '../hooks/use-sign-out';
import { apiRequest } from '../services/api';
import {
    cancelAllReminders,
    CLASS_REMINDERS_ENABLED_KEY,
    ensureNotificationPermissions,
    NIGHT_SUMMARY_ENABLED_KEY,
} from '../services/notifications';
import { getItem, setItem } from '../services/storage';
import { getSubscription, type SubscriptionStatus } from '../services/subscription';

type ProfileResponse = {
    fullName: string;
    email: string;
    studentIndexNumber: string | null;
    phone: string | null;
    bio: string | null;
    programme: string | null;
    level: string | null;
};

export default function ProfileSettingsScreen() {
    const handleSignOut = useSignOut();
    const { token, user, updateUser } = useAuth();

    // Read-mode fields are sourced from the auth context (not local state) so
    // an edit made on the Edit Profile screen shows here immediately, without
    // needing this screen to remount.
    const fullName = user?.fullName || 'Student';
    const email = user?.email || '';
    const indexNumber = user?.indexNumber || '';
    const programme = user?.programme || '';
    const level = user?.level || '';
    const phone = user?.phone || '';
    const bio = user?.bio || '';
    const role = user?.role || 'student';

    const [classReminders, setClassReminders] = useState(true);
    const [assignmentReminders, setAssignmentReminders] = useState(true);
    const [examReminders, setExamReminders] = useState(true);
    const [nightSummary, setNightSummary] = useState(false);
    const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);

    useEffect(() => {
        loadProfile();
    }, []);

    async function loadProfile() {
        // Fresh data when online; falls back silently to whatever's already in
        // the auth context (from storage) when offline.
        try {
            const profile = await apiRequest<ProfileResponse>('/profile/me', { token });
            await updateUser({
                fullName: profile.fullName,
                email: profile.email,
                indexNumber: profile.studentIndexNumber ?? undefined,
                phone: profile.phone ?? undefined,
                bio: profile.bio ?? undefined,
                programme: profile.programme ?? undefined,
                level: profile.level ?? undefined,
            });
        } catch {
            // Offline or request failed — keep showing cached context data.
        }

        const remindersPref = await getItem(CLASS_REMINDERS_ENABLED_KEY);
        if (remindersPref !== null) setClassReminders(remindersPref === 'true');

        const summaryPref = await getItem(NIGHT_SUMMARY_ENABLED_KEY);
        if (summaryPref !== null) setNightSummary(summaryPref === 'true');

        setSubscription(await getSubscription());
    }

    async function handleToggleClassReminders(next: boolean) {
        if (next) {
            const granted = await ensureNotificationPermissions();
            if (!granted) {
                Alert.alert(
                    'Notifications are off',
                    'Allow notifications for ClassMate in your device settings to receive class reminders.'
                );
                return;
            }
            setClassReminders(true);
            await setItem(CLASS_REMINDERS_ENABLED_KEY, 'true');
        } else {
            setClassReminders(false);
            await setItem(CLASS_REMINDERS_ENABLED_KEY, 'false');
            await cancelAllReminders();
        }
    }

    function handleSubscription() {
        router.push('/paywall' as any);
    }

    async function handleToggleNightSummary(next: boolean) {
        // Night-before summary is a Pro feature — send non-Pro users to the paywall.
        if (!subscription?.isProActive) {
            router.push('/paywall' as any);
            return;
        }
        if (next) {
            const granted = await ensureNotificationPermissions();
            if (!granted) {
                Alert.alert(
                    'Notifications are off',
                    'Allow notifications for ClassMate in your device settings to receive the night-before summary.'
                );
                return;
            }
            setNightSummary(true);
            await setItem(NIGHT_SUMMARY_ENABLED_KEY, 'true');
        } else {
            setNightSummary(false);
            await setItem(NIGHT_SUMMARY_ENABLED_KEY, 'false');
        }
    }

    const isManager = role === 'course_rep' || role === 'admin';

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.header}>
                    {isManager && (
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
                            <Ionicons name="chevron-back" size={22} color={AppColors.text} />
                        </TouchableOpacity>
                    )}

                    <Text style={styles.headerTitle}>Profile & Settings</Text>
                    <Text style={styles.headerSubtitle}>
                        Manage your academic profile, reminders, and subscription status.
                    </Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Academic Profile</Text>

                    <View style={styles.profileRow}>
                        <Text style={styles.label}>Name</Text>
                        <Text style={styles.value}>{fullName}</Text>
                    </View>

                    <View style={styles.profileRow}>
                        <View style={styles.labelRow}>
                            <Text style={styles.label}>Email</Text>
                            <Ionicons name="lock-closed-outline" size={11} color={AppColors.mutedText} />
                        </View>
                        <Text style={styles.value}>{email || 'Not available yet'}</Text>
                    </View>

                    <View style={styles.profileRow}>
                        <View style={styles.labelRow}>
                            <Text style={styles.label}>Student Index Number</Text>
                            <Ionicons name="lock-closed-outline" size={11} color={AppColors.mutedText} />
                        </View>
                        <Text style={styles.value}>{indexNumber || 'Not available yet'}</Text>
                    </View>
                    <Text style={styles.lockedNote}>
                        Email and index number are tied to your account and can&apos;t be changed.
                    </Text>

                    <View style={styles.profileRow}>
                        <Text style={styles.label}>Phone</Text>
                        <Text style={styles.value}>{phone || 'Not set'}</Text>
                    </View>

                    <View style={styles.profileRow}>
                        <Text style={styles.label}>Bio</Text>
                        <Text style={styles.value}>{bio || 'Not set'}</Text>
                    </View>

                    <View style={styles.profileRow}>
                        <Text style={styles.label}>Programme</Text>
                        <Text style={styles.value}>{programme || 'Not available yet'}</Text>
                    </View>

                    <View style={styles.profileRow}>
                        <Text style={styles.label}>Level</Text>
                        <Text style={styles.value}>{level || 'Not available yet'}</Text>
                    </View>

                    <View style={styles.profileRow}>
                        <Text style={styles.label}>Role</Text>
                        <Text style={styles.roleBadge}>{role}</Text>
                    </View>

                    <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/edit-profile')}>
                        <Text style={styles.primaryButtonText}>Edit Profile</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.outlineButton, { marginTop: 10 }]}
                        onPress={() => router.push('/change-password')}
                    >
                        <Text style={styles.outlineButtonText}>Change Password</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Notification Preferences</Text>

                    <SettingSwitch
                        title="Class reminders"
                        description="Get a reminder 30 minutes before each class today."
                        value={classReminders}
                        onValueChange={handleToggleClassReminders}
                    />

                    <SettingSwitch
                        title="Assignment reminders"
                        description="Receive reminders before assignment deadlines."
                        value={assignmentReminders}
                        onValueChange={setAssignmentReminders}
                    />

                    <SettingSwitch
                        title="Exam reminders"
                        description="Receive alerts before exams and venue updates."
                        value={examReminders}
                        onValueChange={setExamReminders}
                    />

                    <SettingSwitch
                        title="Night-before summary (Pro)"
                        description="Get a summary of tomorrow’s classes and pending work."
                        value={nightSummary}
                        onValueChange={handleToggleNightSummary}
                    />
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Subscription Status</Text>
                    <Text style={styles.proBadge}>
                        {subscription?.subscribed
                            ? 'Pro'
                            : subscription?.inFreePeriod
                                ? 'Free semester'
                                : 'Free tier'}
                    </Text>
                    <Text style={styles.description}>
                        {subscription?.subscribed
                            ? 'You have all Pro features, including advanced reminders and the night-before summary.'
                            : subscription?.inFreePeriod
                                ? `All Pro features are unlocked free for ${subscription.daysLeftInFree} more days.`
                                : 'Core academic features remain free. Subscribe to unlock Pro reminder features.'}
                    </Text>

                    <TouchableOpacity style={styles.outlineButton} onPress={handleSubscription}>
                        <Text style={styles.outlineButtonText}>
                            {subscription?.subscribed ? 'Manage subscription' : 'View Pro features'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.dangerButton} onPress={handleSignOut}>
                    <Text style={styles.dangerButtonText}>Sign Out</Text>
                </TouchableOpacity>
            </ScrollView>

            <BottomNav active="profile" />
        </SafeAreaView>
    );
}

type SettingSwitchProps = {
    title: string;
    description: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
};

function SettingSwitch({
    title,
    description,
    value,
    onValueChange,
}: SettingSwitchProps) {
    return (
        <View style={styles.settingRow}>
            <View style={styles.settingText}>
                <Text style={styles.settingTitle}>{title}</Text>
                <Text style={styles.settingDescription}>{description}</Text>
            </View>

            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: AppColors.border, true: AppColors.primary }}
                thumbColor={AppColors.card}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: AppColors.background,
    },
    container: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 20,
    },
    backButton: {
        alignSelf: 'flex-start',
        marginBottom: 12,
        width: 40, height: 40, borderRadius: 12, backgroundColor: AppColors.card,
        borderWidth: 1, borderColor: AppColors.border, justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: {
        fontSize: 26,
        fontFamily: Fonts.heading,
        color: AppColors.text,
    },
    headerSubtitle: {
        marginTop: 6,
        fontSize: 14,
        lineHeight: 20,
        color: AppColors.mutedText,
        fontFamily: Fonts.body,
    },
    card: {
        backgroundColor: AppColors.card,
        borderRadius: 18,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: Fonts.headingSemi,
        color: AppColors.text,
        marginBottom: 14,
    },
    profileRow: {
        marginBottom: 12,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginBottom: 3,
    },
    label: {
        fontSize: 12,
        color: AppColors.mutedText,
        marginBottom: 3,
        fontFamily: Fonts.body,
    },
    lockedNote: {
        fontSize: 11,
        color: AppColors.mutedText,
        fontFamily: Fonts.body,
        marginTop: -6,
        marginBottom: 14,
        lineHeight: 15,
    },
    value: {
        fontSize: 15,
        fontFamily: Fonts.bodyMedium,
        color: AppColors.text,
    },
    roleBadge: {
        alignSelf: 'flex-start',
        backgroundColor: AppColors.primary,
        color: AppColors.card,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        overflow: 'hidden',
        fontSize: 12,
        fontFamily: Fonts.bodyBold,
        textTransform: 'uppercase',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: AppColors.border,
    },
    settingText: {
        flex: 1,
        paddingRight: 12,
    },
    settingTitle: {
        fontSize: 15,
        fontFamily: Fonts.bodyBold,
        color: AppColors.text,
    },
    settingDescription: {
        marginTop: 3,
        fontSize: 12,
        lineHeight: 18,
        color: AppColors.mutedText,
        fontFamily: Fonts.body,
    },
    description: {
        fontSize: 14,
        lineHeight: 21,
        color: AppColors.mutedText,
        marginBottom: 14,
        fontFamily: Fonts.body,
    },
    primaryButton: {
        backgroundColor: AppColors.primary,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: AppColors.card,
        fontFamily: Fonts.bodyBold,
    },
    outlineButton: {
        borderWidth: 1,
        borderColor: AppColors.primary,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
    },
    outlineButtonText: {
        color: AppColors.primary,
        fontFamily: Fonts.bodyBold,
    },
    proBadge: {
        alignSelf: 'flex-start',
        backgroundColor: AppColors.accent,
        color: AppColors.text,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        overflow: 'hidden',
        fontSize: 12,
        fontFamily: Fonts.bodyBold,
        marginBottom: 10,
    },
    dangerButton: {
        backgroundColor: AppColors.danger,
        paddingVertical: 15,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 4,
    },
    dangerButtonText: {
        color: AppColors.card,
        fontFamily: Fonts.bodyBold,
    },
});