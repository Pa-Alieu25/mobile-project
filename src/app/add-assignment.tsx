import { AppColors } from '@/constants/colors';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import {
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

type SelectedFile = {
    name: string;
    uri: string;
    mimeType?: string;
    size?: number;
};

export default function AddAssignmentScreen() {
    const [courseCode, setCourseCode] = useState('');
    const [title, setTitle] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [instructions, setInstructions] = useState('');
    const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);

    const handleSelectFile = async () => {
        const result = await DocumentPicker.getDocumentAsync({
            type: [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'image/*',
            ],
            copyToCacheDirectory: true,
        });

        if (result.canceled) {
            return;
        }

        const file = result.assets[0];

        setSelectedFile({
            name: file.name,
            uri: file.uri,
            mimeType: file.mimeType,
            size: file.size,
        });
    };

    const handlePostAssignment = () => {
        const cleanedCourseCode = courseCode.trim();
        const cleanedTitle = title.trim();
        const cleanedDueDate = dueDate.trim();
        const cleanedInstructions = instructions.trim();

        if (!cleanedCourseCode || !cleanedTitle || !cleanedDueDate) {
            Alert.alert(
                'Missing details',
                'Please enter the course code, assignment title, and due date.'
            );
            return;
        }

        if (!selectedFile) {
            Alert.alert(
                'No file selected',
                'Please select the assignment file before posting.'
            );
            return;
        }

        Alert.alert(
            'Assignment ready',
            'The assignment form and file picker work. Backend upload will be connected later.'
        );

        setCourseCode('');
        setTitle('');
        setDueDate('');
        setInstructions('');
        setSelectedFile(null);
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
                        Upload assignment details and attach the file students need.
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

                        <Text style={styles.label}>Assignment File</Text>

                        <TouchableOpacity style={styles.fileButton} onPress={handleSelectFile}>
                            <Text style={styles.fileButtonText}>Select File</Text>
                        </TouchableOpacity>

                        <View style={styles.filePreview}>
                            <Text style={styles.filePreviewLabel}>Selected file</Text>
                            <Text style={styles.filePreviewText}>
                                {selectedFile ? selectedFile.name : 'No file selected'}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.postButton}
                            onPress={handlePostAssignment}
                        >
                            <Text style={styles.postButtonText}>Post Assignment</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.noteCard}>
                        <Text style={styles.noteTitle}>Assignment upload guide</Text>
                        <Text style={styles.noteText}>
                            Attach the original assignment file when available. Add a short
                            description so students know what to do and when to submit.
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
    fileButton: {
        height: 50,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: AppColors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    fileButtonText: {
        color: AppColors.primary,
        fontSize: 15,
        fontWeight: '800',
    },
    filePreview: {
        backgroundColor: AppColors.background,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: AppColors.border,
        marginBottom: 20,
    },
    filePreviewLabel: {
        fontSize: 12,
        color: AppColors.mutedText,
        fontWeight: '700',
        marginBottom: 4,
    },
    filePreviewText: {
        fontSize: 14,
        color: AppColors.text,
        fontWeight: '700',
    },
    postButton: {
        height: 52,
        borderRadius: 12,
        backgroundColor: AppColors.primary,
        justifyContent: 'center',
        alignItems: 'center',
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