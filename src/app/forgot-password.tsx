import { AppColors } from '@/constants/colors';
import { Fonts } from '@/constants/ui';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ForgotPasswordScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Forgot Password</Text>
            <Text style={styles.text}>
                Password recovery will be connected to the backend later.
            </Text>

            <TouchableOpacity style={styles.button} onPress={() => router.replace('/')}>
                <Text style={styles.buttonText}>Back to Sign In</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        backgroundColor: AppColors.background,
    },
    title: {
        fontSize: 30,
        fontFamily: Fonts.heading,
        color: AppColors.primary,
        marginBottom: 12,
        textAlign: 'center',
    },
    text: {
        fontSize: 16,
        color: AppColors.mutedText,
        textAlign: 'center',
        marginBottom: 24,
        fontFamily: Fonts.body,
    },
    button: {
        height: 52,
        backgroundColor: AppColors.primary,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: AppColors.card,
        fontSize: 16,
        fontFamily: Fonts.bodyBold,
    },
});