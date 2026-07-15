import { AppColors } from '@/constants/colors';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity } from 'react-native';

/**
 * Opens Google Maps searching for a venue on KNUST campus. The backend does not
 * store coordinates, so we search by name — accurate enough for campus halls and
 * it works whether or not the Google Maps app is installed.
 */
export function NavigateButton({ query }: { query: string }) {
    const openInMaps = async () => {
        const search = `${query} KNUST Kumasi`.trim();
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(search)}`;
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert('Cannot open Maps', 'No maps application is available on this device.');
            }
        } catch {
            Alert.alert('Cannot open Maps', 'Something went wrong opening the map.');
        }
    };

    return (
        <TouchableOpacity style={styles.button} onPress={openInMaps} accessibilityRole="button">
            <Text style={styles.text}>Navigate</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: AppColors.primary,
        backgroundColor: AppColors.card,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
    },
    text: {
        color: AppColors.primary,
        fontSize: 15,
        fontWeight: '800',
    },
});
