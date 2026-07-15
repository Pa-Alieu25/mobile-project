import { AppColors } from '@/constants/colors';
import { StyleSheet, Text, View } from 'react-native';

/** Shown when a screen is displaying cached data because the network is unavailable. */
export function OfflineBanner() {
    return (
        <View style={styles.banner}>
            <Text style={styles.text}>You&apos;re offline — showing saved data</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        backgroundColor: AppColors.warning,
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginBottom: 14,
    },
    text: {
        color: AppColors.text,
        fontSize: 13,
        fontWeight: '800',
        textAlign: 'center',
    },
});
