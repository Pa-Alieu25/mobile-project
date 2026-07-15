import { AppColors } from '@/constants/colors';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/services/api';
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

export default function ManageTimetableScreen() {
    const { token } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [existingClasses, setExistingClasses] = useState<TimetableRecord[]>([]);
    const [isLoadingList, setIsLoadingList] = useState(true);

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

    useEffect(() => {
        loadClasses();
    }, [loadClasses]);

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
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text style={styles.backText}>Back</Text>
                    </TouchableOpacity>

                    <Text style={styles.title}>Manage Timetable</Text>
                    <Text style={styles.subtitle}>
                        Add class records so students see today, tomorrow, and the full week.
                    </Text>

                    <View style={styles.formCard}>
                        <Text style={styles.sectionTitle}>Add Class Record</Text>
                        <Text style={styles.helperText}>
                            Each record powers the student timetable, next-class view, and status updates.
                        </Text>

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

                        <Text style={styles.label}>Day</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Example: Monday"
                            placeholderTextColor={AppColors.mutedText}
                            value={day}
                            onChangeText={setDay}
                        />

                        <View style={styles.timeRow}>
                            <View style={styles.timeInputWrapper}>
                                <Text style={styles.label}>Start Time</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="8:00 AM"
                                    placeholderTextColor={AppColors.mutedText}
                                    value={startTime}
                                    onChangeText={setStartTime}
                                />
                            </View>

                            <View style={styles.timeInputWrapper}>
                                <Text style={styles.label}>End Time</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="10:00 AM"
                                    placeholderTextColor={AppColors.mutedText}
                                    value={endTime}
                                    onChangeText={setEndTime}
                                />
                            </View>
                        </View>

                        <Text style={styles.label}>Current Venue</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Example: CCB Auditorium"
                            placeholderTextColor={AppColors.mutedText}
                            value={venue}
                            onChangeText={setVenue}
                        />

                        <Text style={styles.label}>Lecturer</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Example: Dr. Mensah"
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
                                    placeholder="Example: Room 5"
                                    placeholderTextColor={AppColors.mutedText}
                                    value={oldVenue}
                                    onChangeText={setOldVenue}
                                />

                                <Text style={styles.label}>New Venue</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Example: CCB Auditorium"
                                    placeholderTextColor={AppColors.mutedText}
                                    value={newVenue}
                                    onChangeText={setNewVenue}
                                />

                                <Text style={styles.label}>Reason / Note</Text>
                                <TextInput
                                    style={styles.noteInput}
                                    placeholder="Example: Lecturer requested a larger room"
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
                                    placeholder="Example: 8:00 AM - 10:00 AM"
                                    placeholderTextColor={AppColors.mutedText}
                                    value={oldTime}
                                    onChangeText={setOldTime}
                                />

                                <Text style={styles.label}>New Time</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Example: 2:00 PM - 4:00 PM"
                                    placeholderTextColor={AppColors.mutedText}
                                    value={newTime}
                                    onChangeText={setNewTime}
                                />

                                <Text style={styles.label}>Reason / Note</Text>
                                <TextInput
                                    style={styles.noteInput}
                                    placeholder="Example: Lecturer is unavailable in the morning"
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
                                    placeholder="Example: Lecturer is unavailable"
                                    placeholderTextColor={AppColors.mutedText}
                                    value={updateReason}
                                    onChangeText={setUpdateReason}
                                    multiline
                                    textAlignVertical="top"
                                />

                                <Text style={styles.label}>Make-up Class Information</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Example: To be announced"
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

                    <View style={styles.listSection}>
                        <Text style={styles.sectionTitle}>Existing classes</Text>
                        <Text style={styles.helperText}>Cancel a class to alert students, or remove it entirely.</Text>

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
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: AppColors.text,
        marginBottom: 6,
    },
    helperText: {
        fontSize: 14,
        color: AppColors.mutedText,
        lineHeight: 20,
        marginBottom: 16,
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
        fontWeight: '700',
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
        fontWeight: '900',
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
        fontWeight: '800',
    },
    disabledButton: {
        backgroundColor: AppColors.primaryDark,
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
        fontWeight: '900',
        color: AppColors.primary,
    },
    classRowStatus: {
        fontSize: 12,
        fontWeight: '800',
        color: AppColors.mutedText,
    },
    classRowStatusCancelled: {
        color: AppColors.danger,
    },
    classRowTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: AppColors.text,
        marginBottom: 4,
    },
    classRowMeta: {
        fontSize: 13,
        color: AppColors.mutedText,
        marginBottom: 12,
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
        fontWeight: '800',
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
        fontWeight: '800',
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
        fontWeight: '800',
        fontSize: 14,
    },
});