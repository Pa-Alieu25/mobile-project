import { AppColors } from '@/constants/colors';
import { Fonts, cardShadow } from '@/constants/ui';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/services/api';
import { parseCsv } from '@/services/csv';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { File as FsFile } from 'expo-file-system';
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

type ParsedRow = { identifier: string; score: string; grade: string };

// Case-insensitive, space-insensitive column lookup so common header spellings work.
function pickColumn(record: Record<string, string>, keys: string[]): string {
    const normalised: Record<string, string> = {};
    for (const key of Object.keys(record)) {
        normalised[key.toLowerCase().replace(/\s+/g, '')] = record[key];
    }
    for (const key of keys) {
        const value = normalised[key];
        if (value != null && value.trim() !== '') return value.trim();
    }
    return '';
}

export default function UploadScoreScreen() {
    const { token } = useAuth();
    const [courseCode, setCourseCode] = useState('');
    const [courseTitle, setCourseTitle] = useState('');
    const [indexNumber, setIndexNumber] = useState('');
    const [score, setScore] = useState('');
    const [grade, setGrade] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [csvRows, setCsvRows] = useState<ParsedRow[]>([]);
    const [csvSkipped, setCsvSkipped] = useState(0);
    const [csvFileName, setCsvFileName] = useState<string | null>(null);
    const [isPublishing, setIsPublishing] = useState(false);

    const clearCsv = () => {
        setCsvRows([]);
        setCsvSkipped(0);
        setCsvFileName(null);
    };

    const pickScoreFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', 'text/plain'],
                copyToCacheDirectory: true,
            });
            if (result.canceled) return;
            const asset = result.assets[0];
            const text = Platform.OS === 'web'
                ? await (await fetch(asset.uri)).text()
                : await new FsFile(asset.uri).text();

            const records = parseCsv(text);
            if (records.length === 0) {
                Alert.alert('Empty or invalid file', 'The CSV needs a header row and at least one row of data.');
                return;
            }

            const valid: ParsedRow[] = [];
            let skipped = 0;
            for (const rec of records) {
                const identifier = pickColumn(rec, ['identifier', 'indexnumber', 'index', 'referencenumber', 'reference', 'refnumber', 'refno']);
                const scoreValue = pickColumn(rec, ['score', 'mark', 'marks']);
                const gradeValue = pickColumn(rec, ['grade']);
                if (!identifier || !scoreValue) { skipped++; continue; }
                valid.push({ identifier, score: scoreValue, grade: gradeValue });
            }
            if (valid.length === 0) {
                Alert.alert('No usable rows', 'The file needs columns for the student identifier (index or reference number) and a score.');
                return;
            }
            setCsvRows(valid);
            setCsvSkipped(skipped);
            setCsvFileName(asset.name);
        } catch (e) {
            Alert.alert('Could not read file', e instanceof Error ? e.message : 'Please choose a valid CSV file.');
        }
    };

    const publishBulk = () => {
        const cc = courseCode.trim();
        const ct = courseTitle.trim();
        if (!cc || !ct) {
            Alert.alert('Add course details', 'Enter the course code and course title above before publishing.');
            return;
        }
        if (csvRows.length === 0) return;
        Alert.alert(
            'Publish scores?',
            `${csvRows.length} score${csvRows.length === 1 ? '' : 's'} for ${cc} will be published, and matched students will be notified.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Publish', onPress: doPublishBulk },
            ]
        );
    };

    const doPublishBulk = async () => {
        try {
            setIsPublishing(true);
            const res = await apiRequest<{ received: number; added: number; unmatched: string[] }>('/scores/bulk', {
                method: 'POST',
                token,
                body: { courseCode: courseCode.trim(), courseTitle: courseTitle.trim(), rows: csvRows },
            });
            const unmatchedNote = res.unmatched.length > 0
                ? `\n\n${res.unmatched.length} could not be matched: ${res.unmatched.slice(0, 5).join(', ')}${res.unmatched.length > 5 ? '…' : ''}`
                : '';
            clearCsv();
            Alert.alert('Upload complete', `${res.added} of ${res.received} scores published.${unmatchedNote}`, [{ text: 'Done' }]);
        } catch (e) {
            Alert.alert('Upload failed', e instanceof Error ? e.message : 'Please try again.');
        } finally {
            setIsPublishing(false);
        }
    };

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

                    <View style={styles.bulkCard}>
                        <Text style={styles.sectionTitle}>Bulk upload from a file</Text>
                        <Text style={styles.bulkHint}>
                            Upload a CSV with a header row to publish many scores at once, using the course code and
                            title above. Students can be identified by index or reference number.
                        </Text>
                        <Text style={styles.codeText}>identifier, score, grade</Text>

                        {csvFileName ? (
                            <>
                                <View style={styles.filePreview}>
                                    <Ionicons name="document-text" size={18} color={AppColors.primary} />
                                    <View style={styles.filePreviewBody}>
                                        <Text style={styles.fileName} numberOfLines={1}>{csvFileName}</Text>
                                        <Text style={styles.fileMeta}>
                                            {csvRows.length} row{csvRows.length === 1 ? '' : 's'} ready{csvSkipped > 0 ? ` · ${csvSkipped} skipped` : ''}
                                        </Text>
                                    </View>
                                    {!isPublishing && (
                                        <TouchableOpacity onPress={clearCsv} hitSlop={8}>
                                            <Ionicons name="close-circle" size={20} color={AppColors.mutedText} />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {csvRows.slice(0, 5).map((r, i) => (
                                    <View key={`${r.identifier}-${i}`} style={styles.previewRow}>
                                        <Text style={styles.previewId} numberOfLines={1}>{r.identifier}</Text>
                                        <Text style={styles.previewScore}>{r.score}{r.grade ? ` · ${r.grade}` : ''}</Text>
                                    </View>
                                ))}
                                {csvRows.length > 5 && <Text style={styles.moreLine}>+{csvRows.length - 5} more</Text>}

                                <TouchableOpacity
                                    style={[styles.button, styles.bulkButton, isPublishing && styles.disabledButton]}
                                    onPress={publishBulk}
                                    disabled={isPublishing}
                                >
                                    {isPublishing ? (
                                        <ActivityIndicator color={AppColors.card} />
                                    ) : (
                                        <Text style={styles.buttonText}>Publish {csvRows.length} score{csvRows.length === 1 ? '' : 's'}</Text>
                                    )}
                                </TouchableOpacity>
                            </>
                        ) : (
                            <TouchableOpacity style={styles.attachButton} onPress={pickScoreFile}>
                                <Ionicons name="cloud-upload-outline" size={18} color={AppColors.primary} />
                                <Text style={styles.attachButtonText}>Choose CSV file</Text>
                            </TouchableOpacity>
                        )}
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
    bulkCard: {
        backgroundColor: AppColors.card,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: AppColors.border,
        marginTop: 18,
        ...cardShadow,
    },
    sectionTitle: { fontSize: 18, fontFamily: Fonts.headingSemi, color: AppColors.text, marginBottom: 6 },
    bulkHint: { fontSize: 13, color: AppColors.mutedText, lineHeight: 19, marginBottom: 12, fontFamily: Fonts.body },
    codeText: {
        fontSize: 12, color: AppColors.text, backgroundColor: AppColors.background,
        borderRadius: 8, padding: 10, marginBottom: 16, fontFamily: Fonts.body,
    },
    attachButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        height: 50, borderRadius: 12, borderWidth: 1, borderColor: AppColors.primary,
        borderStyle: 'dashed', backgroundColor: AppColors.primary + '0D',
    },
    attachButtonText: { color: AppColors.primary, fontSize: 15, fontFamily: Fonts.bodyBold },
    filePreview: {
        flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12,
        borderWidth: 1, borderColor: AppColors.border, backgroundColor: AppColors.background, marginBottom: 12,
    },
    filePreviewBody: { flex: 1 },
    fileName: { fontSize: 14, fontFamily: Fonts.bodyBold, color: AppColors.text },
    fileMeta: { fontSize: 12, color: AppColors.mutedText, marginTop: 2, fontFamily: Fonts.body },
    previewRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10,
        paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: AppColors.border,
    },
    previewId: { flex: 1, fontSize: 13, color: AppColors.text, fontFamily: Fonts.body },
    previewScore: { fontSize: 13, color: AppColors.text, fontFamily: Fonts.bodyBold },
    moreLine: { fontSize: 12, color: AppColors.mutedText, marginTop: 8, fontFamily: Fonts.bodyMedium },
    bulkButton: { marginTop: 16 },
});
