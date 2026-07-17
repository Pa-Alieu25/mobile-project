import { AppColors } from '@/constants/colors';
import { Fonts } from '@/constants/ui';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
export type TabKey = 'home' | 'timetable' | 'alerts' | 'tasks' | 'profile';

const TABS: { key: TabKey; label: string; icon: string; route: string }[] = [
    { key: 'home', label: 'Home', icon: 'home', route: '/student-dashboard' },
    { key: 'timetable', label: 'Timetable', icon: 'calendar', route: '/timetable' },
    { key: 'alerts', label: 'Alerts', icon: 'notifications', route: '/announcements' },
    { key: 'tasks', label: 'Tasks', icon: 'list', route: '/assignments' },
    { key: 'profile', label: 'Profile', icon: 'person', route: '/profile-settings' },
];

/** Fixed bottom tab bar for the main student screens, with a pill-highlighted active tab. */
export function BottomNav({ active }: { active: TabKey }) {
    return (
        <View style={styles.bar}>
            {TABS.map((tab) => {
                const isActive = tab.key === active;
                const iconName = (isActive ? tab.icon : `${tab.icon}-outline`) as IconName;
                return (
                    <TouchableOpacity
                        key={tab.key}
                        style={styles.item}
                        onPress={() => {
                            if (!isActive) router.navigate(tab.route as never);
                        }}
                    >
                        <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                            <Ionicons name={iconName} size={20} color={isActive ? AppColors.card : AppColors.mutedText} />
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
        paddingBottom: 10,
    },
    item: {
        flex: 1,
        alignItems: 'center',
        gap: 3,
    },
    iconWrap: {
        width: 44,
        height: 30,
        borderRadius: 999,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconWrapActive: {
        backgroundColor: AppColors.primary,
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
