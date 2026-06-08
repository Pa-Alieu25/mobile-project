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
        backgroundColor: '#ffffff',
    },
    title: {
        fontSize: 30,
        fontWeight: 'bold',
        color: '#1e3a8a',
        marginBottom: 12,
        textAlign: 'center',
    },
    text: {
        fontSize: 16,
        color: '#4b5563',
        textAlign: 'center',
        marginBottom: 24,
    },
    button: {
        height: 52,
        backgroundColor: '#2563eb',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
    },
});