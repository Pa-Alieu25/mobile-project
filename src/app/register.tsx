import { AppColors } from '@/constants/colors';
import { API_BASE_URL as API_URL } from '@/constants/config';
import { Fonts } from '@/constants/ui';
import { Ionicons } from '@expo/vector-icons';
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
    type TextInputProps,
    TouchableOpacity,
    View,
} from 'react-native';

function getPasswordStrength(password: string): { label: string; color: string } {
    if (password.length === 0) return { label: '', color: 'transparent' };
    if (password.length < 6) return { label: 'Too short', color: AppColors.danger };
    if (password.length < 8) return { label: 'Weak', color: '#E67E22' };
    if (/[A-Z]/.test(password) && /[0-9]/.test(password)) return { label: 'Strong', color: AppColors.success };
    return { label: 'Medium', color: AppColors.accent };
}

type FieldProps = TextInputProps & {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    borderColor?: string;
    rightSlot?: React.ReactNode;
};

function Field({ icon, label, borderColor, rightSlot, ...inputProps }: FieldProps) {
    return (
        <View style={styles.fieldGroup}>
            <Text style={styles.label}>{label}</Text>
            <View style={[styles.field, borderColor ? { borderColor } : null]}>
                <Ionicons name={icon} size={18} color={AppColors.mutedText} />
                <TextInput style={styles.input} placeholderTextColor={AppColors.mutedText} {...inputProps} />
                {rightSlot}
            </View>
        </View>
    );
}

export default function RegisterScreen() {
    const [fullName, setFullName] = useState('');
    const [indexNumber, setIndexNumber] = useState('');
    const [referenceNumber, setReferenceNumber] = useState('');
    const [email, setEmail] = useState('');
    const [programme, setProgramme] = useState('');
    const [level, setLevel] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const passwordStrength = getPasswordStrength(password);
    const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
    const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

    const handleRegister = async () => {
        if (!fullName.trim()) { Alert.alert('Missing field', 'Please enter your full name.'); return; }
        if (!indexNumber.trim()) { Alert.alert('Missing field', 'Please enter your index number.'); return; }
        if (!referenceNumber.trim()) { Alert.alert('Missing field', 'Please enter your reference number.'); return; }
        if (!email.trim() || !email.includes('@')) { Alert.alert('Invalid email', 'Please enter a valid email address.'); return; }
        if (!programme.trim()) { Alert.alert('Missing field', 'Please enter your programme.'); return; }
        if (!level.trim()) { Alert.alert('Missing field', 'Please enter your level.'); return; }
        if (password.length < 6) { Alert.alert('Weak password', 'Password must be at least 6 characters.'); return; }
        if (password !== confirmPassword) { Alert.alert('Password mismatch', 'Both passwords must match.'); return; }

        try {
            setIsLoading(true);
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: fullName.trim(),
                    indexNumber: indexNumber.trim(),
                    referenceNumber: referenceNumber.trim(),
                    email: email.trim().toLowerCase(),
                    programme: programme.trim(),
                    level: level.trim(),
                    password: password.trim(),
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                Alert.alert('Registration failed', errorData?.message || 'The index number, reference number, or email may already be in use.');
                return;
            }

            Alert.alert('Account created', 'Your account has been created successfully. Please sign in.', [{ text: 'Sign in', onPress: () => router.replace('/') }]);
        } catch (error) {
            Alert.alert('Connection error', 'Unable to connect to the server. Please check your connection and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/')} hitSlop={8}>
                    <Ionicons name="chevron-back" size={22} color={AppColors.text} />
                </TouchableOpacity>

                <Text style={styles.heading}>Create your account</Text>
                <Text style={styles.subtitle}>Register with your KNUST student details to get started.</Text>

                <Field label="Full name" icon="person-outline" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
                <Field label="Index number" icon="id-card-outline" value={indexNumber} onChangeText={setIndexNumber} autoCapitalize="characters" autoCorrect={false} />
                <Field label="Reference number" icon="card-outline" value={referenceNumber} onChangeText={setReferenceNumber} autoCapitalize="characters" autoCorrect={false} />
                <Field label="Email" icon="mail-outline" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
                <Field label="Programme" icon="book-outline" value={programme} onChangeText={setProgramme} autoCapitalize="words" />
                <Field label="Level" icon="layers-outline" value={level} onChangeText={setLevel} keyboardType="number-pad" />

                <Field
                    label="Password"
                    icon="lock-closed-outline"
                   
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    rightSlot={
                        <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={AppColors.mutedText} />
                        </TouchableOpacity>
                    }
                />
                {password.length > 0 && (
                    <View style={styles.strengthRow}>
                        <View style={[styles.strengthBar, { backgroundColor: passwordStrength.color }]} />
                        <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>{passwordStrength.label}</Text>
                    </View>
                )}

                <Field
                    label="Confirm password"
                    icon="lock-closed-outline"
                   
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                    borderColor={passwordsMismatch ? AppColors.danger : passwordsMatch ? AppColors.success : undefined}
                />
                {passwordsMismatch && <Text style={styles.errorText}>Passwords do not match</Text>}
                {passwordsMatch && <Text style={styles.successText}>Passwords match</Text>}

                <TouchableOpacity style={[styles.button, isLoading && styles.disabledButton]} onPress={handleRegister} disabled={isLoading}>
                    {isLoading ? <ActivityIndicator color={AppColors.card} /> : <Text style={styles.buttonText}>Create account</Text>}
                </TouchableOpacity>

                <View style={styles.footerRow}>
                    <Text style={styles.footerText}>Already have an account?</Text>
                    <TouchableOpacity onPress={() => router.replace('/')}>
                        <Text style={styles.footerLink}>Sign in</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: AppColors.background },
    scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
    backButton: {
        width: 40, height: 40, borderRadius: 12, backgroundColor: AppColors.card,
        borderWidth: 1, borderColor: AppColors.border, justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    },
    heading: { fontSize: 26, fontFamily: Fonts.heading, color: AppColors.text },
    subtitle: { fontSize: 15, color: AppColors.mutedText, marginTop: 4, marginBottom: 24, lineHeight: 21, fontFamily: Fonts.body },
    fieldGroup: { marginBottom: 14 },
    label: { fontSize: 13, fontFamily: Fonts.bodyMedium, color: AppColors.text, marginBottom: 8 },
    field: {
        flexDirection: 'row', alignItems: 'center', gap: 10, height: 54,
        borderWidth: 1, borderColor: AppColors.border, borderRadius: 14, paddingHorizontal: 14,
        backgroundColor: AppColors.card,
    },
    input: { flex: 1, fontSize: 15, color: AppColors.text, fontFamily: Fonts.body },
    strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2, marginBottom: 14 },
    strengthBar: { height: 4, flex: 1, borderRadius: 2 },
    strengthLabel: { fontSize: 12, fontFamily: Fonts.bodyBold },
    errorText: { fontSize: 12, color: AppColors.danger, marginTop: 2, marginBottom: 14, fontFamily: Fonts.bodyMedium },
    successText: { fontSize: 12, color: AppColors.success, marginTop: 2, marginBottom: 14, fontFamily: Fonts.bodyMedium },
    button: {
        height: 54, backgroundColor: AppColors.primary, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center', marginTop: 6,
    },
    disabledButton: { backgroundColor: AppColors.primaryDark },
    buttonText: { color: AppColors.card, fontSize: 16, fontFamily: Fonts.bodyBold },
    footerRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 22 },
    footerText: { fontSize: 14, color: AppColors.mutedText, fontFamily: Fonts.body },
    footerLink: { fontSize: 14, fontFamily: Fonts.bodyBold, color: AppColors.primary },
});
