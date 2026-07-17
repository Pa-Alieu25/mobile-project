import { AppColors } from '@/constants/colors';
import { Fonts, cardShadow } from '@/constants/ui';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/services/api';
import { formatFileSize, uploadAssignmentDocument, type PickedDocument } from '@/services/documents';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
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

const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

function fileExtensionLabel(name: string): string {
    const dot = name.lastIndexOf('.');
    return dot >= 0 ? name.slice(dot + 1).toUpperCase() : 'FILE';
}

export default function AddAssignmentScreen() {
    const { token } = useAuth();
    const [courseCode, setCourseCode] = useState('');
    const [title, setTitle] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [instructions, setInstructions] = useState('');
    const [document, setDocument] = useState<PickedDocument | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);

    const resetForm = () => {
        setCourseCode('');
        setTitle('');
        setDueDate('');
        setInstructions('');
        setDocument(null);
        setUploadProgress(null);
    };

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ALLOWED_MIME_TYPES,
                copyToCacheDirectory: true,
            });
            if (result.canceled) return;
            const asset = result.assets[0];
            setDocument({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType, size: asset.size });
        } catch {
            Alert.alert('Could not open files', 'Something went wrong while choosing a document. Please try again.');
        }
    };

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
            const created = await apiRequest<{ id: number }>('/assignments', {
                method: 'POST',
                token,
                body: {
                    courseCode: cleanedCourseCode,
                    title: cleanedTitle,
                    dueDate: cleanedDueDate,
                    description: cleanedInstructions,
                },
            });

            // Attach the document, if one was chosen, before confirming success.
            if (document) {
                try {
                    setUploadProgress(0);
                    await uploadAssignmentDocument(created.id, document, token, setUploadProgress);
                } catch (uploadError) {
                    resetForm();
                    Alert.alert(
                        'Assignment posted',
                        `The assignment was posted, but the document could not be attached: ${uploadError instanceof Error ? uploadError.message : 'Please try again.'
                        } You can delete the assignment and post it again to retry.`,
                        [{ text: 'OK', onPress: () => router.back() }]
                    );
                    return;
                }
            }

            resetForm();
            Alert.alert(
                'Assignment posted',
                document ? 'Students can now see this assignment and open its document.' : 'Students can now see this assignment.',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (e) {
            Alert.alert('Could not post', e instanceof Error ? e.message : 'Please try again.');
        } finally {
            setIsSubmitting(false);
            setUploadProgress(null);
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
                    keyboardShouldPersistTaps="handled"
                >
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
                        <Ionicons name="chevron-back" size={22} color={AppColors.text} />
                    </TouchableOpacity>

                    <Text style={styles.title}>Add Assignment</Text>
                    <Text style={styles.subtitle}>
                        Post an assignment with its due date and instructions.
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

                        <Text style={styles.label}>Assignment Title</Text>
                        <TextInput
                            style={styles.input}
                            placeholderTextColor={AppColors.mutedText}
                            value={title}
                            onChangeText={setTitle}
                        />

                        <Text style={styles.label}>Due Date</Text>
                        <TextInput
                            style={styles.input}
                            placeholderTextColor={AppColors.mutedText}
                            value={dueDate}
                            onChangeText={setDueDate}
                        />

                        <Text style={styles.label}>Instructions</Text>
                        <TextInput
                            style={styles.instructionsInput}
                            placeholderTextColor={AppColors.mutedText}
                            value={instructions}
                            onChangeText={setInstructions}
                            multiline
                            textAlignVertical="top"
                        />

                        <Text style={styles.label}>Assignment Document (optional)</Text>
                        {document ? (
                            <View style={styles.docCard}>
                                <View style={styles.docIcon}>
                                    <Ionicons name="document-text" size={20} color={AppColors.primary} />
                                </View>
                                <View style={styles.docInfo}>
                                    <Text style={styles.docName} numberOfLines={1}>{document.name}</Text>
                                    <Text style={styles.docMeta}>
                                        {fileExtensionLabel(document.name)}
                                        {document.size ? ` · ${formatFileSize(document.size)}` : ''}
                                    </Text>
                                </View>
                                {uploadProgress === null && (
                                    <TouchableOpacity onPress={() => setDocument(null)} hitSlop={8} disabled={isSubmitting}>
                                        <Ionicons name="close-circle" size={22} color={AppColors.mutedText} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.attachButton} onPress={pickDocument} disabled={isSubmitting}>
                                <Ionicons name="cloud-upload-outline" size={18} color={AppColors.primary} />
                                <Text style={styles.attachButtonText}>Choose Document</Text>
                            </TouchableOpacity>
                        )}
                        <Text style={styles.helperText}>Supported: PDF, DOC, DOCX, PPT, PPTX (up to 10 MB).</Text>

                        {uploadProgress !== null && (
                            <View style={styles.progressWrap}>
                                <View style={styles.progressTrack}>
                                    <View style={[styles.progressFill, { width: `${Math.round(uploadProgress * 100)}%` }]} />
                                </View>
                                <Text style={styles.progressText}>Uploading document… {Math.round(uploadProgress * 100)}%</Text>
                            </View>
                        )}

                        {document && uploadProgress === null && (
                            <TouchableOpacity style={styles.replaceButton} onPress={pickDocument} disabled={isSubmitting}>
                                <Ionicons name="swap-horizontal-outline" size={16} color={AppColors.primary} />
                                <Text style={styles.replaceButtonText}>Replace document</Text>
                            </TouchableOpacity>
                        )}

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
    backButton: {
        width: 40, height: 40, borderRadius: 12, backgroundColor: AppColors.card,
        borderWidth: 1, borderColor: AppColors.border, justifyContent: 'center', alignItems: 'center', marginBottom: 14,
    },
    title: {
        fontSize: 28,
        fontFamily: Fonts.heading,
        color: AppColors.text,
    },
    subtitle: {
        fontSize: 14,
        color: AppColors.mutedText,
        marginTop: 6,
        marginBottom: 22,
        lineHeight: 20,
        fontFamily: Fonts.body,
    },
    formCard: {
        backgroundColor: AppColors.card,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: AppColors.border,
        ...cardShadow,
    },
    label: {
        fontSize: 14,
        fontFamily: Fonts.bodyBold,
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
        fontFamily: Fonts.body,
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
        fontFamily: Fonts.body,
    },
    attachButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 50,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: AppColors.primary,
        borderStyle: 'dashed',
        backgroundColor: AppColors.primary + '0D',
    },
    attachButtonText: {
        color: AppColors.primary,
        fontSize: 15,
        fontFamily: Fonts.bodyBold,
    },
    docCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: AppColors.border,
        backgroundColor: AppColors.background,
    },
    docIcon: {
        width: 40, height: 40, borderRadius: 11, backgroundColor: AppColors.primary + '14',
        justifyContent: 'center', alignItems: 'center',
    },
    docInfo: { flex: 1 },
    docName: { fontSize: 14, fontFamily: Fonts.bodyBold, color: AppColors.text },
    docMeta: { fontSize: 12, color: AppColors.mutedText, marginTop: 2, fontFamily: Fonts.body },
    helperText: {
        fontSize: 12,
        color: AppColors.mutedText,
        marginTop: 8,
        marginBottom: 18,
        fontFamily: Fonts.body,
    },
    progressWrap: { marginBottom: 18 },
    progressTrack: {
        height: 8, borderRadius: 4, backgroundColor: AppColors.border, overflow: 'hidden',
    },
    progressFill: { height: 8, borderRadius: 4, backgroundColor: AppColors.primary },
    progressText: { fontSize: 12, color: AppColors.mutedText, marginTop: 6, fontFamily: Fonts.bodyMedium },
    replaceButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 18,
    },
    replaceButtonText: { color: AppColors.primary, fontSize: 13, fontFamily: Fonts.bodyMedium },
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
        fontFamily: Fonts.bodyBold,
    },
});
