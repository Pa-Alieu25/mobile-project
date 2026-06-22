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

type ExamVenueStatus = 'pending' | 'confirmed';

export default function ManageExamVenuesScreen() {
    const [courseCode, setCourseCode] = useState('');
    const [courseTitle, setCourseTitle] = useState('');
    const [examDate, setExamDate] = useState('');
    const [examTime, setExamTime] = useState('');
    const [venue, setVenue] = useState('');
    const [buildingOrBlock, setBuildingOrBlock] = useState('');
    const [roomOrHall, setRoomOrHall] = useState('');
    const [startNumber, setStartNumber] = useState('');
    const [endNumber, setEndNumber] = useState('');
    const [status, setStatus] = useState<ExamVenueStatus>('confirmed');
    const [proofFile, setProofFile] = useState<SelectedFile | null>(null);

    const handleSelectProofFile = async () => {
        const result = await DocumentPicker.getDocumentAsync({
            type: ['image/*', 'application/pdf'],
            copyToCacheDirectory: true,
        });

        if (result.canceled) {
            return;
        }

        const file = result.assets[0];

        setProofFile({
            name: file.name,
            uri: file.uri,
            mimeType: file.mimeType,
            size: file.size,
        });
    };

    const handleSaveVenueRange = () => {
        const cleanedCourseCode = courseCode.trim();
        const cleanedCourseTitle = courseTitle.trim();
        const cleanedExamDate = examDate.trim();
        const cleanedExamTime = examTime.trim();
        const cleanedVenue = venue.trim();
        const cleanedBuildingOrBlock = buildingOrBlock.trim();
        const cleanedStartNumber = startNumber.trim();
        const cleanedEndNumber = endNumber.trim();

        if (
            !cleanedCourseCode ||
            !cleanedCourseTitle ||
            !cleanedExamDate ||
            !cleanedExamTime ||
            !cleanedVenue ||
            !cleanedBuildingOrBlock ||
            !cleanedStartNumber ||
            !cleanedEndNumber
        ) {
            Alert.alert(
                'Missing details',
                'Please enter the course details, exam time, venue, building/block, and index/reference number range.'
            );
            return;
        }

        const start = Number(cleanedStartNumber);
        const end = Number(cleanedEndNumber);

        if (Number.isNaN(start) || Number.isNaN(end)) {
            Alert.alert(
                'Invalid range',
                'Start number and end number must contain numbers only.'
            );
            return;
        }

        if (start > end) {
            Alert.alert(
                'Invalid range',
                'The start number cannot be greater than the end number.'
            );
            return;
        }

        Alert.alert(
            'Venue range ready',
            'The exam venue range form works. Backend saving will be connected later.'
        );

        setCourseCode('');
        setCourseTitle('');
        setExamDate('');
        setExamTime('');
        setVenue('');
        setBuildingOrBlock('');
        setRoomOrHall('');
        setStartNumber('');
        setEndNumber('');
        setStatus('confirmed');
        setProofFile(null);
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

                    <Text style={styles.title}>Manage Exam Venues</Text>
                    <Text style={styles.subtitle}>
                        Add exam venue ranges so students can search with their index or
                        reference number.
                    </Text>

                    <View style={styles.formCard}>
                        <Text style={styles.sectionTitle}>Exam Details</Text>

                        <Text style={styles.label}>Course Code</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter course code"
                            placeholderTextColor={AppColors.mutedText}
                            value={courseCode}
                            onChangeText={setCourseCode}
                            autoCapitalize="characters"
                        />

                        <Text style={styles.label}>Course Title</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter course title"
                            placeholderTextColor={AppColors.mutedText}
                            value={courseTitle}
                            onChangeText={setCourseTitle}
                        />

                        <Text style={styles.label}>Exam Date</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter exam date"
                            placeholderTextColor={AppColors.mutedText}
                            value={examDate}
                            onChangeText={setExamDate}
                        />

                        <Text style={styles.label}>Exam Time</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter exam time"
                            placeholderTextColor={AppColors.mutedText}
                            value={examTime}
                            onChangeText={setExamTime}
                        />

                        <Text style={styles.sectionTitle}>Venue Details</Text>

                        <Text style={styles.label}>Venue</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter exam venue"
                            placeholderTextColor={AppColors.mutedText}
                            value={venue}
                            onChangeText={setVenue}
                        />

                        <Text style={styles.label}>Building / Block</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter building or block"
                            placeholderTextColor={AppColors.mutedText}
                            value={buildingOrBlock}
                            onChangeText={setBuildingOrBlock}
                        />

                        <Text style={styles.label}>Room / Hall Optional</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter room or hall if available"
                            placeholderTextColor={AppColors.mutedText}
                            value={roomOrHall}
                            onChangeText={setRoomOrHall}
                        />

                        <Text style={styles.sectionTitle}>Index / Reference Range</Text>
                        <Text style={styles.helperText}>
                            Enter the index/reference number range from the official exam
                            venue notice.
                        </Text>

                        <View style={styles.rangeRow}>
                            <View style={styles.rangeInputWrapper}>
                                <Text style={styles.label}>Start Number</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Start"
                                    placeholderTextColor={AppColors.mutedText}
                                    value={startNumber}
                                    onChangeText={setStartNumber}
                                    keyboardType="number-pad"
                                />
                            </View>

                            <View style={styles.rangeInputWrapper}>
                                <Text style={styles.label}>End Number</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="End"
                                    placeholderTextColor={AppColors.mutedText}
                                    value={endNumber}
                                    onChangeText={setEndNumber}
                                    keyboardType="number-pad"
                                />
                            </View>
                        </View>

                        <Text style={styles.sectionTitle}>Status</Text>

                        <View style={styles.statusRow}>
                            <TouchableOpacity
                                style={[
                                    styles.statusButton,
                                    status === 'confirmed' && styles.activeStatusButton,
                                ]}
                                onPress={() => setStatus('confirmed')}
                            >
                                <Text
                                    style={[
                                        styles.statusButtonText,
                                        status === 'confirmed' && styles.activeStatusButtonText,
                                    ]}
                                >
                                    Confirmed
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.statusButton,
                                    status === 'pending' && styles.activeStatusButton,
                                ]}
                                onPress={() => setStatus('pending')}
                            >
                                <Text
                                    style={[
                                        styles.statusButtonText,
                                        status === 'pending' && styles.activeStatusButtonText,
                                    ]}
                                >
                                    Pending
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Photo / PDF Proof</Text>
                        <TouchableOpacity style={styles.fileButton} onPress={handleSelectProofFile}>
                            <Text style={styles.fileButtonText}>Select Proof File</Text>
                        </TouchableOpacity>

                        <View style={styles.filePreview}>
                            <Text style={styles.filePreviewLabel}>Selected file</Text>
                            <Text style={styles.filePreviewText}>
                                {proofFile ? proofFile.name : 'No file selected'}
                            </Text>
                        </View>

                        <TouchableOpacity style={styles.saveButton} onPress={handleSaveVenueRange}>
                            <Text style={styles.saveButtonText}>Save Venue Range</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.noteCard}>
                        <Text style={styles.noteTitle}>Why range entry?</Text>
                        <Text style={styles.noteText}>
                            One venue range can cover many students. This is faster than
                            entering each student one by one and better than forcing students
                            to search through WhatsApp images.
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
    sectionTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: AppColors.text,
        marginBottom: 10,
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
    rangeRow: {
        flexDirection: 'row',
        gap: 12,
    },
    rangeInputWrapper: {
        flex: 1,
    },
    statusRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 18,
    },
    statusButton: {
        flex: 1,
        height: 46,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: AppColors.border,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: AppColors.card,
    },
    activeStatusButton: {
        backgroundColor: AppColors.primary,
        borderColor: AppColors.primary,
    },
    statusButtonText: {
        color: AppColors.mutedText,
        fontSize: 14,
        fontWeight: '800',
    },
    activeStatusButtonText: {
        color: AppColors.card,
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