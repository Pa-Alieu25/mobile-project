import { AppColors } from '@/constants/colors';
import { Fonts } from '@/constants/ui';
import { useAuth } from '@/context/auth-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type TabKey = 'home' | 'timetable' | 'alerts' | 'tasks' | 'profile';

type Tab = {
    key: TabKey;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconActive: keyof typeof Ionicons.glyphMap;
    route: string;
};

const TABS: Tab[] = [
    { key: 'home', label: 'Home', icon: 'home-outline', iconActive: 'home', route: '/student-dashboard' },
    { key: 'timetable', label: 'Timetable', icon: 'calendar-outline', iconActive: 'calendar', route: '/timetable' },
    { key: 'alerts', label: 'Alerts', icon: 'megaphone-outline', iconActive: 'megaphone', route: '/announcements' },
    { key: 'tasks', label: 'Tasks', icon: 'document-text-outline', iconActive: 'document-text', route: '/assignments' },
    { key: 'profile', label: 'Profile', icon: 'person-outline', iconActive: 'person', route: '/profile-settings' },
];

/**
 * Persistent bottom navigation for the student experience. It renders only for
 * students — course reps and admins use their panel-based navigation, so the
 * bar is hidden for them to avoid pointing at student-only screens.
 */
export function BottomNav({ active }: { active: TabKey }) {
    const { role } = useAuth();
    const insets = useSafeAreaInsets();

    if (role && role !== 'student') return null;

    return (
        <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
            {TABS.map((tab) => {
                const isActive = tab.key === active;
                return (
                    <TouchableOpacity
                        key={tab.key}
                        style={styles.tab}
                        onPress={() => {
                            if (!isActive) router.navigate(tab.route as never);
                        }}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                            <Ionicons
                                name={isActive ? tab.iconActive : tab.icon}
                                size={20}
                                color={isActive ? AppColors.primary : AppColors.mutedText}
                            />
                        </View>
                        <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    bar: {
        flexDirection: 'row',
        backgroundColor: AppColors.card,
        borderTopWidth: 1,
        borderTopColor: AppColors.border,
        paddingTop: 8,
        paddingHorizontal: 6,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        gap: 3,
    },
    iconWrap: {
        width: 46,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconWrapActive: {
        backgroundColor: AppColors.primary + '16',
    },
    label: {
        fontSize: 11,
        color: AppColors.mutedText,
        fontFamily: Fonts.bodyMedium,
    },
    labelActive: {
        color: AppColors.primary,
        fontFamily: Fonts.bodyBold,
    },
});
