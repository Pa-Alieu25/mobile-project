import { AppColors } from '@/constants/colors';
import { StyleSheet, Text, View } from 'react-native';

const CONFIG: Record<string, { label: string; color: string }> = {
    active: { label: 'Active', color: AppColors.statusActive },
    cancelled: { label: 'Cancelled', color: AppColors.statusCancelled },
    venue_changed: { label: 'Venue changed', color: AppColors.statusVenueChanged },
    time_changed: { label: 'Time changed', color: AppColors.statusTimeChanged },
    confirmed: { label: 'Confirmed', color: AppColors.statusActive },
    pending: { label: 'Pending', color: AppColors.statusVenueChanged },
};

/** A small coloured status chip with a leading dot (Active / Cancelled / etc.). */
export function StatusPill({ status }: { status: string }) {
    const cfg = CONFIG[status] ?? { label: status, color: AppColors.mutedText };
    return (
        <View style={[styles.pill, { backgroundColor: cfg.color + '18', borderColor: cfg.color + '40' }]}>
            <View style={[styles.dot, { backgroundColor: cfg.color }]} />
            <Text style={[styles.text, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        alignSelf: 'flex-start',
    },
    dot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    text: {
        fontSize: 12,
        fontWeight: '700',
    },
});
