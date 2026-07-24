import { AppColors } from '@/constants/colors';
import { Fonts } from '@/constants/ui';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/services/api';
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
import { SafeAreaView } from 'react-native-safe-area-context';

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

export default function ChangePasswordScreen() {
    const { token } = useAuth();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPasswords, setShowPasswords] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const newPasswordTooShort = newPassword.length > 0 && newPassword.length < 8;
    const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
    const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

    const canSave =
        currentPassword.length > 0 &&
        newPassword.length >= 8 &&
        confirmPassword.length > 0 &&
        newPassword === confirmPassword &&
        !isSaving;

    const handleSave = async () => {
        if (!canSave) return;
        try {
            setIsSaving(true);
            await apiRequest('/profile/password', {
                method: 'PUT',
                token,
                body: { currentPassword, newPassword },
            });

            Alert.alert('Password changed', 'Your password has been updated.', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (e) {
            // Keep what the user typed so they can correct just the wrong field.
            Alert.alert('Could not change password', e instanceof Error ? e.message : 'Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
                            <Ionicons name="chevron-back" size={22} color={AppColors.text} />
                        </TouchableOpacity>
                        <Text style={styles.heading}>Change Password</Text>
                    </View>
                    <Text style={styles.subtitle}>Choose a new password with at least 8 characters.</Text>

                    <Field
                        label="Current password"
                        icon="lock-closed-outline"
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        secureTextEntry={!showPasswords}
                        rightSlot={
                            <TouchableOpacity onPress={() => setShowPasswords((v) => !v)} hitSlop={8}>
                                <Ionicons name={showPasswords ? 'eye-off-outline' : 'eye-outline'} size={18} color={AppColors.mutedText} />
                            </TouchableOpacity>
                        }
                    />

                    <Field
                        label="New password"
                        icon="lock-closed-outline"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showPasswords}
                        borderColor={newPasswordTooShort ? AppColors.danger : undefined}
                    />
                    {newPasswordTooShort && <Text style={styles.errorText}>Password must be at least 8 characters.</Text>}

                    <Field
                        label="Confirm new password"
                        icon="lock-closed-outline"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showPasswords}
                        borderColor={passwordsMismatch ? AppColors.danger : passwordsMatch ? AppColors.success : undefined}
                    />
                    {passwordsMismatch && <Text style={styles.errorText}>Passwords do not match</Text>}
                    {passwordsMatch && <Text style={styles.successText}>Passwords match</Text>}

                    <TouchableOpacity
                        style={[styles.button, !canSave && styles.disabledButton]}
                        onPress={handleSave}
                        disabled={!canSave}
                    >
                        {isSaving ? <ActivityIndicator color={AppColors.card} /> : <Text style={styles.buttonText}>Update password</Text>}
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: AppColors.background },
    safeArea: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
    backButton: {
        width: 40, height: 40, borderRadius: 12, backgroundColor: AppColors.card,
        borderWidth: 1, borderColor: AppColors.border, justifyContent: 'center', alignItems: 'center',
    },
    heading: { fontSize: 22, fontFamily: Fonts.heading, color: AppColors.text },
    subtitle: { fontSize: 14, color: AppColors.mutedText, marginBottom: 22, lineHeight: 20, fontFamily: Fonts.body },
    fieldGroup: { marginBottom: 14 },
    label: { fontSize: 13, fontFamily: Fonts.bodyMedium, color: AppColors.text, marginBottom: 8 },
    field: {
        flexDirection: 'row', alignItems: 'center', gap: 10, height: 54,
        borderWidth: 1, borderColor: AppColors.border, borderRadius: 14, paddingHorizontal: 14,
        backgroundColor: AppColors.card,
    },
    input: { flex: 1, fontSize: 15, color: AppColors.text, fontFamily: Fonts.body },
    errorText: { fontSize: 12, color: AppColors.danger, marginTop: 2, marginBottom: 14, fontFamily: Fonts.bodyMedium },
    successText: { fontSize: 12, color: AppColors.success, marginTop: 2, marginBottom: 14, fontFamily: Fonts.bodyMedium },
    button: {
        height: 54, backgroundColor: AppColors.primary, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center', marginTop: 6,
    },
    disabledButton: { backgroundColor: AppColors.border },
    buttonText: { color: AppColors.card, fontSize: 16, fontFamily: Fonts.bodyBold },
});
