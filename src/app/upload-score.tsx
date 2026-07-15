import { AppColors } from '@/constants/colors';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/services/api';
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
                <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text style={styles.backText}>Back</Text>
                    </TouchableOpacity>

                    <Text style={styles.title}>Upload Midsem Score</Text>
                    <Text style={styles.subtitle}>
                        Enter a student&apos;s score by index number. Only that student sees it, and they get an alert.
                    </Text>

                    <View style={styles.formCard}>
                        <Text style={styles.label}>Course Code</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Example: CSM 281"
                            placeholderTextColor={AppColors.mutedText}
                            value={courseCode}
                            onChangeText={setCourseCode}
                            autoCapitalize="characters"
                        />

                        <Text style={styles.label}>Course Title</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Example: Object Oriented Programming"
                            placeholderTextColor={AppColors.mutedText}
                            value={courseTitle}
                            onChangeText={setCourseTitle}
                        />

                        <Text style={styles.label}>Student Index Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Example: 6170524"
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
                                    placeholder="Example: 18/20"
                                    placeholderTextColor={AppColors.mutedText}
                                    value={score}
                                    onChangeText={setScore}
                                />
                            </View>
                            <View style={styles.rowItem}>
                                <Text style={styles.label}>Grade</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Example: A"
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

                    <View style={styles.noteCard}>
                        <Text style={styles.noteTitle}>One score at a time</Text>
                        <Text style={styles.noteText}>
                            Bulk CSV/Excel upload is a planned addition. For now each score is matched to a single
                            student by their index number.
                        </Text>
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
    backText: { color: AppColors.primary, fontSize: 15, fontWeight: '700', marginBottom: 14 },
    title: { fontSize: 28, fontWeight: '900', color: AppColors.text },
    subtitle: { fontSize: 14, color: AppColors.mutedText, marginTop: 6, marginBottom: 22, lineHeight: 20 },
    formCard: {
        backgroundColor: AppColors.card,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    label: { fontSize: 14, fontWeight: '800', color: AppColors.text, marginBottom: 8 },
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
    buttonText: { color: AppColors.card, fontSize: 16, fontWeight: '800' },
    noteCard: {
        marginTop: 18,
        backgroundColor: AppColors.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    noteTitle: { fontSize: 15, fontWeight: '800', color: AppColors.text, marginBottom: 6 },
    noteText: { fontSize: 14, color: AppColors.mutedText, lineHeight: 20 },
});
