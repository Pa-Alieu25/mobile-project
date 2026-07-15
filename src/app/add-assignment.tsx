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

export default function AddAssignmentScreen() {
    const { token } = useAuth();
    const [courseCode, setCourseCode] = useState('');
    const [title, setTitle] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [instructions, setInstructions] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handlePostAssignment = async () => {
        const cleanedCourseCode = courseCode.trim();
        const cleanedTitle = title.trim();
        const cleanedDueDate = dueDate.trim();
        const cleanedInstructions = instructions.trim();

        if (!cleanedCourseCode || !cleanedTitle || !cleanedDueDate) {
            Alert.alert('Missing details', 'Please enter the course code, assignment title, and due date.');
            return;
        }

        if (cleanedInstructions.length < 5) {
            Alert.alert('Add instructions', 'Please add a short description of what students need to do.');
            return;
        }

        try {
            setIsSubmitting(true);
            await apiRequest('/assignments', {
                method: 'POST',
                token,
                body: {
                    courseCode: cleanedCourseCode,
                    title: cleanedTitle,
                    dueDate: cleanedDueDate,
                    description: cleanedInstructions,
                },
            });

            Alert.alert('Assignment posted', 'Students can now see this assignment.', [
                { text: 'OK', onPress: () => router.back() },
            ]);

            setCourseCode('');
            setTitle('');
            setDueDate('');
            setInstructions('');
        } catch (e) {
            Alert.alert('Could not post', e instanceof Error ? e.message : 'Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    style={styles.container}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text style={styles.backText}>Back</Text>
                    </TouchableOpacity>

                    <Text style={styles.title}>Add Assignment</Text>
                    <Text style={styles.subtitle}>
                        Post an assignment with its due date and instructions.
                    </Text>

                    <View style={styles.formCard}>
                        <Text style={styles.label}>Course Code</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Example: CSM 291"
                            placeholderTextColor={AppColors.mutedText}
                            value={courseCode}
                            onChangeText={setCourseCode}
                            autoCapitalize="characters"
                        />

                        <Text style={styles.label}>Assignment Title</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Example: DFD Assignment"
                            placeholderTextColor={AppColors.mutedText}
                            value={title}
                            onChangeText={setTitle}
                        />

                        <Text style={styles.label}>Due Date</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Example: Friday, 11:59 PM"
                            placeholderTextColor={AppColors.mutedText}
                            value={dueDate}
                            onChangeText={setDueDate}
                        />

                        <Text style={styles.label}>Instructions</Text>
                        <TextInput
                            style={styles.instructionsInput}
                            placeholder="Write short submission instructions..."
                            placeholderTextColor={AppColors.mutedText}
                            value={instructions}
                            onChangeText={setInstructions}
                            multiline
                            textAlignVertical="top"
                        />

                        <TouchableOpacity
                            style={[styles.postButton, isSubmitting && styles.disabledButton]}
                            onPress={handlePostAssignment}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color={AppColors.card} />
                            ) : (
                                <Text style={styles.postButtonText}>Post Assignment</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.noteCard}>
                        <Text style={styles.noteTitle}>Assignment guide</Text>
                        <Text style={styles.noteText}>
                            Add a clear title and instructions so students know what to do and when to submit.
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: AppColors.background,
    },
    keyboardView: {
        flex: 1,
    },
    container: {
        flex: 1,
        backgroundColor: AppColors.background,
    },
    content: {
        padding: 20,
        paddingBottom: 36,
    },
    backText: {
        color: AppColors.primary,
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 14,
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: AppColors.text,
    },
    subtitle: {
        fontSize: 14,
        color: AppColors.mutedText,
        marginTop: 6,
        marginBottom: 22,
        lineHeight: 20,
    },
    formCard: {
        backgroundColor: AppColors.card,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    label: {
        fontSize: 14,
        fontWeight: '800',
        color: AppColors.text,
        marginBottom: 8,
    },
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
    instructionsInput: {
        minHeight: 120,
        borderWidth: 1,
        borderColor: AppColors.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 18,
        fontSize: 15,
        color: AppColors.text,
        backgroundColor: AppColors.background,
        lineHeight: 21,
    },
    postButton: {
        height: 52,
        borderRadius: 12,
        backgroundColor: AppColors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: AppColors.primaryDark,
    },
    postButtonText: {
        color: AppColors.card,
        fontSize: 16,
        fontWeight: '800',
    },
    noteCard: {
        marginTop: 18,
        backgroundColor: AppColors.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    noteTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: AppColors.text,
        marginBottom: 6,
    },
    noteText: {
        fontSize: 14,
        color: AppColors.mutedText,
        lineHeight: 20,
    },
});
