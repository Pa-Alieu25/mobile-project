import { AppColors } from '@/constants/colors';
import { Fonts, cardShadow } from '@/constants/ui';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/services/api';
import {
    formatFileSize,
    openTimetableDocument,
    uploadTimetableDocument,
    type PickedDocument,
    type TimetableDocumentMeta,
} from '@/services/documents';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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

type ClassStatus = 'Normal' | 'Venue Changed' | 'Time Changed' | 'Cancelled';

// Map the rep-facing labels to the status values the backend/student app use.
const STATUS_MAP: Record<ClassStatus, string> = {
    Normal: 'active',
    'Venue Changed': 'venue_changed',
    'Time Changed': 'time_changed',
    Cancelled: 'cancelled',
};

type TimetableRecord = {
    id: number;
    courseCode: string;
    courseTitle: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    venue: string;
    status: string;
};

function statusLabel(status: string) {
    if (status === 'cancelled') return 'Cancelled';
    if (status === 'venue_changed') return 'Venue changed';
    if (status === 'time_changed') return 'Time changed';
    return 'Active';
}

const DOCUMENT_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/comma-separated-values',
    'image/jpeg',
    'image/png',
];

function fileExtensionLabel(name: string): string {
    const dot = name.lastIndexOf('.');
    return dot >= 0 ? name.slice(dot + 1).toUpperCase() : 'FILE';
}

export default function ManageTimetableScreen() {
    const { token } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [existingClasses, setExistingClasses] = useState<TimetableRecord[]>([]);
    const [isLoadingList, setIsLoadingList] = useState(true);

    const [timetableDocs, setTimetableDocs] = useState<TimetableDocumentMeta[]>([]);
    const [pickedDoc, setPickedDoc] = useState<PickedDocument | null>(null);
    const [docProgress, setDocProgress] = useState<number | null>(null);

    const [courseCode, setCourseCode] = useState('');
    const [courseTitle, setCourseTitle] = useState('');
    const [day, setDay] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [venue, setVenue] = useState('');
    const [lecturer, setLecturer] = useState('');
    const [status, setStatus] = useState<ClassStatus>('Normal');

    const [oldVenue, setOldVenue] = useState('');
    const [newVenue, setNewVenue] = useState('');
    const [oldTime, setOldTime] = useState('');
    const [newTime, setNewTime] = useState('');
    const [updateReason, setUpdateReason] = useState('');
    const [makeUpClassInfo, setMakeUpClassInfo] = useState('');

    const resetUpdateFields = () => {
        setOldVenue('');
        setNewVenue('');
        setOldTime('');
        setNewTime('');
        setUpdateReason('');
        setMakeUpClassInfo('');
    };

    const handleStatusChange = (selectedStatus: ClassStatus) => {
        setStatus(selectedStatus);
        resetUpdateFields();
    };

    const loadClasses = useCallback(async () => {
        try {
            const data = await apiRequest<TimetableRecord[]>('/timetable', { token });
            setExistingClasses(data);
        } catch {
            // leave the list as-is on failure
        } finally {
            setIsLoadingList(false);
        }
    }, [token]);

    const loadDocs = useCallback(async () => {
        try {
            setTimetableDocs(await apiRequest<TimetableDocumentMeta[]>('/timetable/document', { token }));
        } catch {
            // ignore; the section just shows no document
        }
    }, [token]);

    useEffect(() => {
        loadClasses();
        loadDocs();
    }, [loadClasses, loadDocs]);

    const pickTimetableDoc = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: DOCUMENT_MIME_TYPES, copyToCacheDirectory: true });
            if (result.canceled) return;
            const asset = result.assets[0];
            setPickedDoc({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType, size: asset.size });
        } catch {
            Alert.alert('Could not open files', 'Something went wrong while choosing a document. Please try again.');
        }
    };

    const handleUploadDoc = async () => {
        if (!pickedDoc) return;
        try {
            setDocProgress(0);
            await uploadTimetableDocument(pickedDoc, token, setDocProgress);
            setPickedDoc(null);
            await loadDocs();
            Alert.alert('Timetable uploaded', 'Students can now open the official timetable document.');
        } catch (e) {
            Alert.alert('Upload failed', e instanceof Error ? e.message : 'Please try again.');
        } finally {
            setDocProgress(null);
        }
    };

    const handleOpenDoc = async (doc: TimetableDocumentMeta) => {
        try {
            await openTimetableDocument(doc.id, doc.originalName, token);
        } catch (e) {
            Alert.alert('Could not open document', e instanceof Error ? e.message : 'Please try again.');
        }
    };

    const handleDeleteDoc = (doc: TimetableDocumentMeta) => {
        Alert.alert('Delete this timetable document?', 'Students will no longer be able to open it. This action cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await apiRequest(`/timetable/document/${doc.id}`, { method: 'DELETE', token });
                        await loadDocs();
                    } catch (e) {
                        Alert.alert('Could not delete', e instanceof Error ? e.message : 'Please try again.');
                    }
                },
            },
        ]);
    };

    const setClassStatus = async (id: number, newStatus: string) => {
        try {
            await apiRequest(`/timetable/${id}/status`, {
                method: 'PUT',
                token,
                body: { status: newStatus },
            });
            await loadClasses();
        } catch (e) {
            Alert.alert('Could not update', e instanceof Error ? e.message : 'Please try again.');
        }
    };

    const handleCancelClass = (record: TimetableRecord) => {
        Alert.alert('Cancel this class?', `${record.courseCode} on ${record.dayOfWeek} will show as cancelled and students will be alerted.`, [
            { text: 'Keep', style: 'cancel' },
            { text: 'Cancel class', style: 'destructive', onPress: () => setClassStatus(record.id, 'cancelled') },
        ]);
    };

    const handleDeleteClass = (record: TimetableRecord) => {
        Alert.alert('Delete this class?', `${record.courseCode} on ${record.dayOfWeek} will be removed from the timetable.`, [
            { text: 'Keep', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await apiRequest(`/timetable/${record.id}`, { method: 'DELETE', token });
                        await loadClasses();
                    } catch (e) {
                        Alert.alert('Could not delete', e instanceof Error ? e.message : 'Please try again.');
                    }
                },
            },
        ]);
    };

    const handleSaveClass = async () => {
        const cleanedCourseCode = courseCode.trim();
        const cleanedCourseTitle = courseTitle.trim();
        const cleanedDay = day.trim();
        const cleanedStartTime = startTime.trim();
        const cleanedEndTime = endTime.trim();
        const cleanedVenue = venue.trim();
        const cleanedLecturer = lecturer.trim();

        if (
            !cleanedCourseCode ||
            !cleanedCourseTitle ||
            !cleanedDay ||
            !cleanedStartTime ||
            !cleanedEndTime ||
            !cleanedVenue ||
            !cleanedLecturer
        ) {
            Alert.alert(
                'Missing details',
                'Please enter the course code, course title, day, time, venue, and lecturer.'
            );
            return;
        }

        if (status === 'Venue Changed' && (!oldVenue.trim() || !newVenue.trim())) {
            Alert.alert('Missing venue update', 'Please enter both the old venue and the new venue.');
            return;
        }

        if (status === 'Time Changed' && (!oldTime.trim() || !newTime.trim())) {
            Alert.alert('Missing time update', 'Please enter both the old time and the new time.');
            return;
        }

        if (status === 'Cancelled' && !updateReason.trim()) {
            Alert.alert('Missing cancellation reason', 'Please enter why the class was cancelled.');
            return;
        }

        try {
            setIsSubmitting(true);
            await apiRequest('/timetable', {
                method: 'POST',
                token,
                body: {
                    courseCode: cleanedCourseCode,
                    courseTitle: cleanedCourseTitle,
                    dayOfWeek: cleanedDay,
                    startTime: cleanedStartTime,
                    endTime: cleanedEndTime,
                    venue: cleanedVenue,
                    lecturer: cleanedLecturer,
                    classGroup: 'ALL',
                    status: STATUS_MAP[status],
                },
            });

            Alert.alert('Class saved', 'This class now appears in the student timetable.');

            setCourseCode('');
            setCourseTitle('');
            setDay('');
            setStartTime('');
            setEndTime('');
            setVenue('');
            setLecturer('');
            setStatus('Normal');
            resetUpdateFields();
            await loadClasses();
        } catch (e) {
            Alert.alert('Could not save', e instanceof Error ? e.message : 'Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const statusOptions: ClassStatus[] = [
        'Normal',
        'Venue Changed',
        'Time Changed',
        'Cancelled',
    ];

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
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
                        <Ionicons name="chevron-back" size={22} color={AppColors.text} />
                    </TouchableOpacity>

                    <Text style={styles.title}>Manage Timetable</Text>
                    <Text style={styles.subtitle}>
                        Add class records so students see today, tomorrow, and the full week.
                    </Text>

                    <View style={styles.formCard}>
                        <Text style={styles.sectionTitle}>Add Class Record</Text>

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

                        <Text style={styles.label}>Day</Text>
                        <TextInput
                            style={styles.input}
                            placeholderTextColor={AppColors.mutedText}
                            value={day}
                            onChangeText={setDay}
                        />

                        <View style={styles.timeRow}>
                            <View style={styles.timeInputWrapper}>
                                <Text style={styles.label}>Start Time</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholderTextColor={AppColors.mutedText}
                                    value={startTime}
                                    onChangeText={setStartTime}
                                />
                            </View>

                            <View style={styles.timeInputWrapper}>
                                <Text style={styles.label}>End Time</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholderTextColor={AppColors.mutedText}
                                    value={endTime}
                                    onChangeText={setEndTime}
                                />
                            </View>
                        </View>

                        <Text style={styles.label}>Current Venue</Text>
                        <TextInput
                            style={styles.input}
                            placeholderTextColor={AppColors.mutedText}
                            value={venue}
                            onChangeText={setVenue}
                        />

                        <Text style={styles.label}>Lecturer</Text>
                        <TextInput
                            style={styles.input}
                            placeholderTextColor={AppColors.mutedText}
                            value={lecturer}
                            onChangeText={setLecturer}
                        />

                        <Text style={styles.label}>Class Status</Text>
                        <View style={styles.statusList}>
                            {statusOptions.map((item) => (
                                <TouchableOpacity
                                    key={item}
                                    style={[
                                        styles.statusButton,
                                        status === item && styles.activeStatusButton,
                                    ]}
                                    onPress={() => handleStatusChange(item)}
                                >
                                    <Text
                                        style={[
                                            styles.statusText,
                                            status === item && styles.activeStatusText,
                                        ]}
                                    >
                                        {item}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {status === 'Venue Changed' && (
                            <View style={styles.updateBox}>
                                <Text style={styles.updateTitle}>Venue Change Details</Text>

                                <Text style={styles.label}>Old Venue</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholderTextColor={AppColors.mutedText}
                                    value={oldVenue}
                                    onChangeText={setOldVenue}
                                />

                                <Text style={styles.label}>New Venue</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholderTextColor={AppColors.mutedText}
                                    value={newVenue}
                                    onChangeText={setNewVenue}
                                />

                                <Text style={styles.label}>Reason / Note</Text>
                                <TextInput
                                    style={styles.noteInput}
                                    placeholderTextColor={AppColors.mutedText}
                                    value={updateReason}
                                    onChangeText={setUpdateReason}
                                    multiline
                                    textAlignVertical="top"
                                />
                            </View>
                        )}

                        {status === 'Time Changed' && (
                            <View style={styles.updateBox}>
                                <Text style={styles.updateTitle}>Time Change Details</Text>

                                <Text style={styles.label}>Old Time</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholderTextColor={AppColors.mutedText}
                                    value={oldTime}
                                    onChangeText={setOldTime}
                                />

                                <Text style={styles.label}>New Time</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholderTextColor={AppColors.mutedText}
                                    value={newTime}
                                    onChangeText={setNewTime}
                                />

                                <Text style={styles.label}>Reason / Note</Text>
                                <TextInput
                                    style={styles.noteInput}
                                    placeholderTextColor={AppColors.mutedText}
                                    value={updateReason}
                                    onChangeText={setUpdateReason}
                                    multiline
                                    textAlignVertical="top"
                                />
                            </View>
                        )}

                        {status === 'Cancelled' && (
                            <View style={styles.updateBox}>
                                <Text style={styles.updateTitle}>Cancellation Details</Text>

                                <Text style={styles.label}>Cancellation Reason</Text>
                                <TextInput
                                    style={styles.noteInput}
                                    placeholderTextColor={AppColors.mutedText}
                                    value={updateReason}
                                    onChangeText={setUpdateReason}
                                    multiline
                                    textAlignVertical="top"
                                />

                                <Text style={styles.label}>Make-up Class Information</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholderTextColor={AppColors.mutedText}
                                    value={makeUpClassInfo}
                                    onChangeText={setMakeUpClassInfo}
                                />
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.saveButton, isSubmitting && styles.disabledButton]}
                            onPress={handleSaveClass}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color={AppColors.card} />
                            ) : (
                                <Text style={styles.saveButtonText}>Save Class Record</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.docCard}>
                        <Text style={styles.sectionTitle}>Official timetable document</Text>

                        {timetableDocs.map((doc) => (
                            <View key={doc.id} style={styles.docRow}>
                                <View style={styles.docRowIcon}>
                                    <Ionicons name="document-text" size={18} color={AppColors.primary} />
                                </View>
                                <TouchableOpacity style={styles.docRowBody} onPress={() => handleOpenDoc(doc)}>
                                    <Text style={styles.docRowName} numberOfLines={1}>{doc.originalName}</Text>
                                    <Text style={styles.docRowMeta}>
                                        {fileExtensionLabel(doc.originalName)}{doc.size ? ` · ${formatFileSize(doc.size)}` : ''} · {doc.uploadedAt}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleDeleteDoc(doc)} hitSlop={8}>
                                    <Ionicons name="trash-outline" size={18} color={AppColors.danger} />
                                </TouchableOpacity>
                            </View>
                        ))}

                        {pickedDoc ? (
                            <View style={styles.docPicked}>
                                <Ionicons name="document-attach" size={18} color={AppColors.primary} />
                                <View style={styles.docRowBody}>
                                    <Text style={styles.docRowName} numberOfLines={1}>{pickedDoc.name}</Text>
                                    <Text style={styles.docRowMeta}>
                                        {fileExtensionLabel(pickedDoc.name)}{pickedDoc.size ? ` · ${formatFileSize(pickedDoc.size)}` : ''}
                                    </Text>
                                </View>
                                {docProgress === null && (
                                    <TouchableOpacity onPress={() => setPickedDoc(null)} hitSlop={8}>
                                        <Ionicons name="close-circle" size={20} color={AppColors.mutedText} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.attachButton} onPress={pickTimetableDoc}>
                                <Ionicons name="cloud-upload-outline" size={18} color={AppColors.primary} />
                                <Text style={styles.attachButtonText}>Choose Document</Text>
                            </TouchableOpacity>
                        )}

                        {docProgress !== null && (
                            <View style={styles.progressWrap}>
                                <View style={styles.progressTrack}>
                                    <View style={[styles.progressFill, { width: `${Math.round(docProgress * 100)}%` }]} />
                                </View>
                                <Text style={styles.progressText}>Uploading… {Math.round(docProgress * 100)}%</Text>
                            </View>
                        )}

                        {pickedDoc && docProgress === null && (
                            <TouchableOpacity style={styles.uploadDocButton} onPress={handleUploadDoc}>
                                <Text style={styles.uploadDocButtonText}>Upload timetable</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.listSection}>
                        <Text style={styles.sectionTitle}>Existing classes</Text>

                        {isLoadingList ? (
                            <ActivityIndicator color={AppColors.primary} style={styles.listLoader} />
                        ) : existingClasses.length === 0 ? (
                            <Text style={styles.emptyListText}>No classes added yet.</Text>
                        ) : (
                            existingClasses.map((c) => {
                                const cancelled = c.status === 'cancelled';
                                return (
                                    <View key={c.id} style={styles.classRow}>
                                        <View style={styles.classRowHeader}>
                                            <Text style={styles.classRowCode}>{c.courseCode}</Text>
                                            <Text style={[styles.classRowStatus, cancelled && styles.classRowStatusCancelled]}>
                                                {statusLabel(c.status)}
                                            </Text>
                                        </View>
                                        <Text style={styles.classRowTitle}>{c.courseTitle}</Text>
                                        <Text style={styles.classRowMeta}>
                                            {c.dayOfWeek} · {c.startTime} - {c.endTime} · {c.venue}
                                        </Text>

                                        <View style={styles.classRowActions}>
                                            {cancelled ? (
                                                <TouchableOpacity style={styles.restoreButton} onPress={() => setClassStatus(c.id, 'active')}>
                                                    <Text style={styles.restoreButtonText}>Restore</Text>
                                                </TouchableOpacity>
                                            ) : (
                                                <TouchableOpacity style={styles.cancelButton} onPress={() => handleCancelClass(c)}>
                                                    <Text style={styles.cancelButtonText}>Cancel class</Text>
                                                </TouchableOpacity>
                                            )}
                                            <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteClass(c)}>
                                                <Text style={styles.deleteButtonText}>Delete</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })
                        )}
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
    fileCard: {
        backgroundColor: AppColors.card,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: AppColors.border,
        marginBottom: 18,
    },
    formCard: {
        backgroundColor: AppColors.card,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: AppColors.border,
        ...cardShadow,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: Fonts.heading,
        color: AppColors.text,
        marginBottom: 6,
    },
    helperText: {
        fontSize: 14,
        color: AppColors.mutedText,
        lineHeight: 20,
        marginBottom: 16,
        fontFamily: Fonts.body,
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
    noteInput: {
        minHeight: 90,
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
    timeRow: {
        flexDirection: 'row',
        gap: 12,
    },
    timeInputWrapper: {
        flex: 1,
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
    statusList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 20,
    },
    statusButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 18,
        backgroundColor: AppColors.background,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    activeStatusButton: {
        backgroundColor: AppColors.primary,
        borderColor: AppColors.primary,
    },
    statusText: {
        color: AppColors.mutedText,
        fontSize: 13,
        fontFamily: Fonts.bodyMedium,
    },
    activeStatusText: {
        color: AppColors.card,
    },
    updateBox: {
        backgroundColor: AppColors.background,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: AppColors.border,
        marginBottom: 20,
    },
    updateTitle: {
        fontSize: 16,
        fontFamily: Fonts.heading,
        color: AppColors.primary,
        marginBottom: 12,
    },
    saveButton: {
        height: 52,
        borderRadius: 12,
        backgroundColor: AppColors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveButtonText: {
        color: AppColors.card,
        fontSize: 16,
        fontFamily: Fonts.bodyBold,
    },
    disabledButton: {
        backgroundColor: AppColors.primaryDark,
    },
    docCard: {
        backgroundColor: AppColors.card,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: AppColors.border,
        marginTop: 18,
        ...cardShadow,
    },
    docRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: AppColors.border,
        backgroundColor: AppColors.background,
        marginBottom: 12,
    },
    docRowIcon: {
        width: 38, height: 38, borderRadius: 11, backgroundColor: AppColors.primary + '14',
        justifyContent: 'center', alignItems: 'center',
    },
    docRowBody: { flex: 1 },
    docRowName: { fontSize: 14, fontFamily: Fonts.bodyBold, color: AppColors.text },
    docRowMeta: { fontSize: 12, color: AppColors.mutedText, marginTop: 2, fontFamily: Fonts.body },
    docPicked: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: AppColors.border,
        backgroundColor: AppColors.background,
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
    attachButtonText: { color: AppColors.primary, fontSize: 15, fontFamily: Fonts.bodyBold },
    progressWrap: { marginTop: 14 },
    progressTrack: { height: 8, borderRadius: 4, backgroundColor: AppColors.border, overflow: 'hidden' },
    progressFill: { height: 8, borderRadius: 4, backgroundColor: AppColors.primary },
    progressText: { fontSize: 12, color: AppColors.mutedText, marginTop: 6, fontFamily: Fonts.bodyMedium },
    uploadDocButton: {
        height: 50, borderRadius: 12, backgroundColor: AppColors.primary,
        justifyContent: 'center', alignItems: 'center', marginTop: 14,
    },
    uploadDocButtonText: { color: AppColors.card, fontSize: 15, fontFamily: Fonts.bodyBold },
    listSection: {
        marginTop: 18,
    },
    listLoader: {
        marginTop: 12,
    },
    emptyListText: {
        fontSize: 14,
        color: AppColors.mutedText,
        marginTop: 8,
        fontFamily: Fonts.body,
    },
    classRow: {
        backgroundColor: AppColors.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: AppColors.border,
        marginBottom: 12,
    },
    classRowHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
        gap: 10,
    },
    classRowCode: {
        fontSize: 13,
        fontFamily: Fonts.bodyBold,
        color: AppColors.primary,
    },
    classRowStatus: {
        fontSize: 12,
        fontFamily: Fonts.bodyBold,
        color: AppColors.mutedText,
    },
    classRowStatusCancelled: {
        color: AppColors.danger,
    },
    classRowTitle: {
        fontSize: 16,
        fontFamily: Fonts.headingSemi,
        color: AppColors.text,
        marginBottom: 4,
    },
    classRowMeta: {
        fontSize: 13,
        color: AppColors.mutedText,
        marginBottom: 12,
        fontFamily: Fonts.body,
    },
    classRowActions: {
        flexDirection: 'row',
        gap: 10,
    },
    cancelButton: {
        flex: 1,
        height: 42,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: AppColors.warning,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButtonText: {
        color: AppColors.warning,
        fontFamily: Fonts.bodyBold,
        fontSize: 14,
    },
    restoreButton: {
        flex: 1,
        height: 42,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: AppColors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    restoreButtonText: {
        color: AppColors.primary,
        fontFamily: Fonts.bodyBold,
        fontSize: 14,
    },
    deleteButton: {
        flex: 1,
        height: 42,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: AppColors.danger,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteButtonText: {
        color: AppColors.danger,
        fontFamily: Fonts.bodyBold,
        fontSize: 14,
    },
});