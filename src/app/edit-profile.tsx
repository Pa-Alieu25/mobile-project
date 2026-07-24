import { AppColors } from '@/constants/colors';
import { Fonts } from '@/constants/ui';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
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

// Mirrors UpdateProfileRequest's server-side validation (backend/.../profile/UpdateProfileRequest.java).
const GHANA_PHONE_REGEX = /^$|^(0[235]\d{8}|\+233[235]\d{8})$/;

type ProfileResponse = {
    id: number;
    fullName: string;
    email: string;
    studentIndexNumber: string | null;
    phone: string | null;
    bio: string | null;
    programme: string | null;
    level: string | null;
    avatarUrl: string | null;
};

type FieldProps = TextInputProps & {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    error?: string;
};

function Field({ icon, label, error, ...inputProps }: FieldProps) {
    return (
        <View style={styles.fieldGroup}>
            <Text style={styles.label}>{label}</Text>
            <View style={[styles.field, error ? { borderColor: AppColors.danger } : null]}>
                <Ionicons name={icon} size={18} color={AppColors.mutedText} />
                <TextInput style={styles.input} placeholderTextColor={AppColors.mutedText} {...inputProps} />
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    );
}

export default function EditProfileScreen() {
    const { token, user, updateUser } = useAuth();

    const original = useMemo(
        () => ({
            fullName: user?.fullName ?? '',
            phone: user?.phone ?? '',
            bio: user?.bio ?? '',
            programme: user?.programme ?? '',
            level: user?.level ?? '',
        }),
        [user]
    );

    const [fullName, setFullName] = useState(original.fullName);
    const [phone, setPhone] = useState(original.phone);
    const [bio, setBio] = useState(original.bio);
    const [programme, setProgramme] = useState(original.programme);
    const [level, setLevel] = useState(original.level);
    const [isSaving, setIsSaving] = useState(false);

    const hasChanges =
        fullName.trim() !== original.fullName ||
        phone.trim() !== original.phone ||
        bio.trim() !== original.bio ||
        programme.trim() !== original.programme ||
        level.trim() !== original.level;

    const fullNameError =
        fullName.trim().length === 0
            ? 'Full name is required.'
            : fullName.trim().length < 2 || fullName.trim().length > 100
                ? 'Full name must be between 2 and 100 characters.'
                : undefined;

    const phoneError = !GHANA_PHONE_REGEX.test(phone.trim())
        ? 'Enter a valid Ghana phone number, e.g. 0244123456 or +233244123456.'
        : undefined;

    const bioError = bio.trim().length > 500 ? 'Bio must be 500 characters or fewer.' : undefined;

    const isValid = !fullNameError && !phoneError && !bioError;
    const canSave = hasChanges && isValid && !isSaving;

    const handleSave = async () => {
        if (!canSave) return;
        try {
            setIsSaving(true);
            const updated = await apiRequest<ProfileResponse>('/profile/me', {
                method: 'PUT',
                token,
                body: {
                    fullName: fullName.trim(),
                    phone: phone.trim(),
                    bio: bio.trim(),
                    programme: programme.trim(),
                    level: level.trim(),
                },
            });

            await updateUser({
                fullName: updated.fullName,
                phone: updated.phone ?? undefined,
                bio: updated.bio ?? undefined,
                programme: updated.programme ?? undefined,
                level: updated.level ?? undefined,
            });

            Alert.alert('Profile updated', 'Your changes have been saved.', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (e) {
            // Keep the user's input in place so they don't have to retype anything.
            Alert.alert('Could not save changes', e instanceof Error ? e.message : 'Please try again.');
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
                        <Text style={styles.heading}>Edit Profile</Text>
                    </View>

                    <View style={styles.lockedRow}>
                        <View style={styles.lockedTextGroup}>
                            <Text style={styles.lockedLabel}>Email</Text>
                            <Text style={styles.lockedValue}>{user?.email || 'Not available'}</Text>
                        </View>
                        <Ionicons name="lock-closed-outline" size={16} color={AppColors.mutedText} />
                    </View>
                    <View style={styles.lockedRow}>
                        <View style={styles.lockedTextGroup}>
                            <Text style={styles.lockedLabel}>Student Index Number</Text>
                            <Text style={styles.lockedValue}>{user?.indexNumber || 'Not available'}</Text>
                        </View>
                        <Ionicons name="lock-closed-outline" size={16} color={AppColors.mutedText} />
                    </View>
                    <Text style={styles.lockedNote}>
                        Email and index number are tied to your account and can&apos;t be changed here.
                    </Text>

                    <Field label="Full name" icon="person-outline" value={fullName} onChangeText={setFullName} autoCapitalize="words" error={fullNameError} />
                    <Field
                        label="Phone"
                        icon="call-outline"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        placeholder="e.g. 0244123456"
                        error={phoneError}
                    />
                    <Field
                        label="Bio"
                        icon="chatbox-ellipses-outline"
                        value={bio}
                        onChangeText={setBio}
                        multiline
                        numberOfLines={4}
                        style={styles.bioInput}
                        error={bioError}
                    />
                    <Field label="Programme" icon="book-outline" value={programme} onChangeText={setProgramme} autoCapitalize="words" />
                    <Field label="Level" icon="layers-outline" value={level} onChangeText={setLevel} keyboardType="number-pad" />

                    <TouchableOpacity
                        style={[styles.button, !canSave && styles.disabledButton]}
                        onPress={handleSave}
                        disabled={!canSave}
                    >
                        {isSaving ? <ActivityIndicator color={AppColors.card} /> : <Text style={styles.buttonText}>Save changes</Text>}
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
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    backButton: {
        width: 40, height: 40, borderRadius: 12, backgroundColor: AppColors.card,
        borderWidth: 1, borderColor: AppColors.border, justifyContent: 'center', alignItems: 'center',
    },
    heading: { fontSize: 22, fontFamily: Fonts.heading, color: AppColors.text },
    lockedRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        height: 54, borderWidth: 1, borderColor: AppColors.border, borderRadius: 14,
        paddingHorizontal: 14, backgroundColor: AppColors.border, marginBottom: 10,
    },
    lockedTextGroup: { flex: 1 },
    lockedLabel: { fontSize: 12, color: AppColors.mutedText, fontFamily: Fonts.body },
    lockedValue: { fontSize: 15, fontFamily: Fonts.bodyMedium, color: AppColors.mutedText },
    lockedNote: { fontSize: 12, color: AppColors.mutedText, fontFamily: Fonts.body, marginBottom: 18, lineHeight: 17 },
    fieldGroup: { marginBottom: 14 },
    label: { fontSize: 13, fontFamily: Fonts.bodyMedium, color: AppColors.text, marginBottom: 8 },
    field: {
        flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 54,
        borderWidth: 1, borderColor: AppColors.border, borderRadius: 14, paddingHorizontal: 14,
        backgroundColor: AppColors.card,
    },
    input: { flex: 1, fontSize: 15, color: AppColors.text, fontFamily: Fonts.body, paddingVertical: 14 },
    bioInput: { textAlignVertical: 'top', paddingTop: 12 },
    errorText: { fontSize: 12, color: AppColors.danger, marginTop: 6, fontFamily: Fonts.bodyMedium },
    button: {
        height: 54, backgroundColor: AppColors.primary, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center', marginTop: 10,
    },
    disabledButton: { backgroundColor: AppColors.border },
    buttonText: { color: AppColors.card, fontSize: 16, fontFamily: Fonts.bodyBold },
});
