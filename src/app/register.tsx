import { router } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity
} from 'react-native';

type RegisterRequest = {
    fullName: string;
    indexNumber: string;
    referenceNumber: string;
    email: string;
    programme: string;
    level: string;
    password: string;
};

const API_URL = 'http://10.0.2.2:8080/api';

export default function RegisterScreen() {
    const [fullName, setFullName] = useState('');
    const [indexNumber, setIndexNumber] = useState('');
    const [referenceNumber, setReferenceNumber] = useState('');
    const [email, setEmail] = useState('');
    const [programme, setProgramme] = useState('');
    const [level, setLevel] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleRegister = async () => {
        const cleanedFullName = fullName.trim();
        const cleanedIndexNumber = indexNumber.trim();
        const cleanedReferenceNumber = referenceNumber.trim();
        const cleanedEmail = email.trim().toLowerCase();
        const cleanedProgramme = programme.trim();
        const cleanedLevel = level.trim();
        const cleanedPassword = password.trim();
        const cleanedConfirmPassword = confirmPassword.trim();

        if (
            !cleanedFullName ||
            !cleanedIndexNumber ||
            !cleanedReferenceNumber ||
            !cleanedEmail ||
            !cleanedProgramme ||
            !cleanedLevel ||
            !cleanedPassword ||
            !cleanedConfirmPassword
        ) {
            Alert.alert('Missing details', 'Please fill in all fields.');
            return;
        }

        if (!cleanedEmail.includes('@')) {
            Alert.alert('Invalid email', 'Please enter a valid email address.');
            return;
        }

        if (cleanedPassword.length < 6) {
            Alert.alert(
                'Weak password',
                'Your password must be at least 6 characters long.'
            );
            return;
        }

        if (cleanedPassword !== cleanedConfirmPassword) {
            Alert.alert('Password mismatch', 'Both passwords must match.');
            return;
        }

        const registerData: RegisterRequest = {
            fullName: cleanedFullName,
            indexNumber: cleanedIndexNumber,
            referenceNumber: cleanedReferenceNumber,
            email: cleanedEmail,
            programme: cleanedProgramme,
            level: cleanedLevel,
            password: cleanedPassword,
        };

        try {
            setIsLoading(true);

            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(registerData),
            });

            if (!response.ok) {
                Alert.alert(
                    'Registration failed',
                    'Unable to create account. The index number, reference number, or email may already exist.'
                );
                return;
            }

            Alert.alert(
                'Account created',
                'Your account has been created successfully. Please sign in.',
                [
                    {
                        text: 'Go to login',
                        onPress: () => router.replace('/'),
                    },
                ]
            );
        } catch (error) {
            Alert.alert(
                'Connection error',
                'Unable to connect to the server. Please check your connection and try again.'
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Register for KNUST ClassMate</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                />

                <TextInput
                    style={styles.input}
                    placeholder="Index Number"
                    value={indexNumber}
                    onChangeText={setIndexNumber}
                    autoCapitalize="characters"
                    autoCorrect={false}
                />

                <TextInput
                    style={styles.input}
                    placeholder="Reference Number"
                    value={referenceNumber}
                    onChangeText={setReferenceNumber}
                    autoCapitalize="characters"
                    autoCorrect={false}
                />

                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                />

                <TextInput
                    style={styles.input}
                    placeholder="Programme"
                    value={programme}
                    onChangeText={setProgramme}
                    autoCapitalize="words"
                />

                <TextInput
                    style={styles.input}
                    placeholder="Level"
                    value={level}
                    onChangeText={setLevel}
                    keyboardType="number-pad"
                />

                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />

                <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                />

                <TouchableOpacity
                    style={[styles.button, isLoading && styles.disabledButton]}
                    onPress={handleRegister}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#ffffff" />
                    ) : (
                        <Text style={styles.buttonText}>Create Account</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.replace('/')}>
                    <Text style={styles.linkText}>Already have an account? Sign in</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 32,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1e3a8a',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666666',
        textAlign: 'center',
        marginBottom: 28,
    },
    input: {
        height: 52,
        borderWidth: 1,
        borderColor: '#dddddd',
        borderRadius: 10,
        paddingHorizontal: 16,
        marginBottom: 14,
        fontSize: 16,
        backgroundColor: '#fafafa',
    },
    button: {
        height: 52,
        backgroundColor: '#2563eb',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    disabledButton: {
        backgroundColor: '#93c5fd',
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
    },
    linkText: {
        marginTop: 20,
        textAlign: 'center',
        color: '#2563eb',
        fontSize: 15,
        fontWeight: '600',
    },
});