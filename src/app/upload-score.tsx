import { AppColors } from '@/constants/colors';
import { Fonts, cardShadow } from '@/constants/ui';
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
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function UploadScoreScreen() {
    const { token } = useAuth();
    const [courseCode, setCourseCode] = useState('');
    const [courseTitle, setCourseTitle] = useState('');
    const [indexNumber, setIndexNumber] = useState('');
    const [score, setScore] = useState('');
    const [grade, setGrade] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleUpload = async () => {
        const values = {
            courseCode: courseCode.trim(),
            courseTitle: courseTitle.trim(),
            indexNumber: indexNumber.trim(),
            score: score.trim(),
            grade: grade.trim(),
        };

        if (!values.courseCode || !values.courseTitle || !values.indexNumber || !values.score || !values.grade) {
            Alert.alert('Missing details', 'Please fill in the course, index number, score and grade.');
            return;
        }

        try {
            setIsSubmitting(true);
            await apiRequest('/scores', { method: 'POST', token, body: values });
            Alert.alert('Score uploaded', `The student with index ${values.indexNumber} can now see this score.`, [
                { text: 'Add another', onPress: () => { setIndexNumber(''); setScore(''); setGrade(''); } },
                { text: 'Done', onPress: () => router.back() },
            ]);
        } catch (e) {
            Alert.alert('Could not upload', e instanceof Error ? e.message : 'Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
                        <Ionicons name="chevron-back" size={22} color={AppColors.text} />
                    </TouchableOpacity>

                    <Text style={styles.title}>Upload Midsem Score</Text>
                    <Text style={styles.subtitle}>
                        Enter a student&apos;s score by index number. Only that student sees it, and they get an alert.
                    </Text>

                    <View style={styles.formCard}>
                        <Text style={styles.label}>Course Code</Text>
                        <TextInput
                            style={styles.input}
                            placeholderTextColor={AppColors.mutedText}
                            value={courseCode}
                            onChangeText={setCourseCode}
                            autoCapitalize="characters"
                        />

                        <Text style={styles.label}>Course Title</Text>
                        <TextInput
                            style={styles.input}
                            placeholderTextColor={AppColors.mutedText}
                            value={courseTitle}
                            onChangeText={setCourseTitle}
                        />

                        <Text style={styles.label}>Student Index Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholderTextColor={AppColors.mutedText}
                            value={indexNumber}
                            onChangeText={setIndexNumber}
                            autoCapitalize="characters"
                            autoCorrect={false}
                        />

                        <View style={styles.row}>
                            <View style={styles.rowItem}>
                                <Text style={styles.label}>Score</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholderTextColor={AppColors.mutedText}
                                    value={score}
                                    onChangeText={setScore}
                                />
                            </View>
                            <View style={styles.rowItem}>
                                <Text style={styles.label}>Grade</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholderTextColor={AppColors.mutedText}
                                    value={grade}
                                    onChangeText={setGrade}
                                    autoCapitalize="characters"
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.button, isSubmitting && styles.disabledButton]}
                            onPress={handleUpload}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color={AppColors.card} />
                            ) : (
                                <Text style={styles.buttonText}>Upload Score</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: AppColors.background },
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: AppColors.background },
    content: { padding: 20, paddingBottom: 36 },
    backButton: {
        width: 40, height: 40, borderRadius: 12, backgroundColor: AppColors.card,
        borderWidth: 1, borderColor: AppColors.border, justifyContent: 'center', alignItems: 'center', marginBottom: 14,
    },
    title: { fontSize: 28, fontFamily: Fonts.heading, color: AppColors.text },
    subtitle: { fontSize: 14, color: AppColors.mutedText, marginTop: 6, marginBottom: 22, lineHeight: 20, fontFamily: Fonts.body },
    formCard: {
        backgroundColor: AppColors.card,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: AppColors.border,
        ...cardShadow,
    },
    label: { fontSize: 14, fontFamily: Fonts.bodyBold, color: AppColors.text, marginBottom: 8 },
    input: {
        height: 52,
        borderWidth: 1,
        borderColor: AppColors.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        marginBottom: 18,
        fontSize: 15,
        color: AppColors.text,
        backgroundColor: AppColors.background,
        fontFamily: Fonts.body,
    },
    row: { flexDirection: 'row', gap: 12 },
    rowItem: { flex: 1 },
    button: {
        height: 52,
        borderRadius: 12,
        backgroundColor: AppColors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabledButton: { backgroundColor: AppColors.primaryDark },
    buttonText: { color: AppColors.card, fontSize: 16, fontFamily: Fonts.bodyBold },
});
