import { AppColors } from '@/constants/colors';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ExamVenueRecord = {
    id: number;
    courseCode: string;
    courseTitle: string;
    examDate: string;
    examTime: string;
    venue: string;
    startIndex: number;
    endIndex: number;
    note: string;
    status: 'Pending' | 'Confirmed';
};

const examVenueRecords: ExamVenueRecord[] = [];

export default function ExamVenueSearchScreen() {
    const [searchNumber, setSearchNumber] = useState('');
    const [matchedVenue, setMatchedVenue] = useState<ExamVenueRecord | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearchVenue = () => {
        const cleanedNumber = searchNumber.trim();

        if (!cleanedNumber) {
            Alert.alert(
                'Missing number',
                'Please enter your index number or reference number.'
            );
            return;
        }

        const numericValue = Number(cleanedNumber);

        if (Number.isNaN(numericValue)) {
            Alert.alert(
                'Invalid number',
                'Please enter numbers only. Example: 6170524'
            );
            return;
        }

        const foundVenue = examVenueRecords.find(
            (record) =>
                numericValue >= record.startIndex && numericValue <= record.endIndex
        );

        setMatchedVenue(foundVenue || null);
        setHasSearched(true);
    };

    const handleClearSearch = () => {
        setSearchNumber('');
        setMatchedVenue(null);
        setHasSearched(false);
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>

                <Text style={styles.title}>Exam Venue Search</Text>
                <Text style={styles.subtitle}>
                    Enter your index number to quickly find your exam room from the posted
                    venue ranges.
                </Text>

                <View style={styles.searchCard}>
                    <Text style={styles.label}>Index / Reference Number</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter your index number"
                        placeholderTextColor={AppColors.mutedText}
                        value={searchNumber}
                        onChangeText={setSearchNumber}
                        keyboardType="number-pad"
                    />

                    <TouchableOpacity style={styles.searchButton} onPress={handleSearchVenue}>
                        <Text style={styles.searchButtonText}>Search Venue</Text>
                    </TouchableOpacity>

                    {hasSearched && (
                        <TouchableOpacity style={styles.clearButton} onPress={handleClearSearch}>
                            <Text style={styles.clearButtonText}>Clear Search</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {hasSearched && matchedVenue && (
                    <View style={styles.resultCard}>
                        <Text style={styles.resultLabel}>Your Exam Venue</Text>
                        <Text style={styles.venueText}>{matchedVenue.venue}</Text>

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Course</Text>
                            <Text style={styles.infoValue}>
                                {matchedVenue.courseCode} - {matchedVenue.courseTitle}
                            </Text>
                        </View>

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Date & Time</Text>
                            <Text style={styles.infoValue}>
                                {matchedVenue.examDate}, {matchedVenue.examTime}
                            </Text>
                        </View>

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Range</Text>
                            <Text style={styles.infoValue}>
                                {matchedVenue.startIndex} - {matchedVenue.endIndex}
                            </Text>
                        </View>

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Status</Text>
                            <Text style={styles.infoValue}>{matchedVenue.status}</Text>
                        </View>

                        <Text style={styles.noteText}>{matchedVenue.note}</Text>
                    </View>
                )}

                {hasSearched && !matchedVenue && (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>No venue found yet</Text>
                        <Text style={styles.emptyText}>
                            Your exam venue range may not have been uploaded yet. Please check
                            again later or contact your course rep.
                        </Text>
                    </View>
                )}

                <View style={styles.guideCard}>
                    <Text style={styles.guideTitle}>How this helps</Text>
                    <Text style={styles.guideText}>
                        Instead of walking around classrooms or searching WhatsApp images,
                        students can enter their index number and instantly see the correct
                        exam venue once the course rep uploads the ranges.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: AppColors.background,
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
    searchCard: {
        backgroundColor: AppColors.card,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: AppColors.border,
        marginBottom: 18,
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
        marginBottom: 16,
        fontSize: 15,
        color: AppColors.text,
        backgroundColor: AppColors.background,
    },
    searchButton: {
        height: 52,
        borderRadius: 12,
        backgroundColor: AppColors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchButtonText: {
        color: AppColors.card,
        fontSize: 16,
        fontWeight: '800',
    },
    clearButton: {
        height: 46,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: AppColors.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
    },
    clearButtonText: {
        color: AppColors.mutedText,
        fontSize: 14,
        fontWeight: '700',
    },
    resultCard: {
        backgroundColor: AppColors.primary,
        borderRadius: 18,
        padding: 18,
        marginBottom: 18,
    },
    resultLabel: {
        color: AppColors.accent,
        fontSize: 13,
        fontWeight: '900',
        marginBottom: 8,
    },
    venueText: {
        color: AppColors.card,
        fontSize: 26,
        fontWeight: '900',
        marginBottom: 16,
    },
    infoRow: {
        marginBottom: 10,
    },
    infoLabel: {
        color: AppColors.accent,
        fontSize: 12,
        fontWeight: '800',
        marginBottom: 3,
    },
    infoValue: {
        color: AppColors.card,
        fontSize: 14,
        fontWeight: '700',
        lineHeight: 20,
    },
    noteText: {
        color: AppColors.card,
        fontSize: 14,
        lineHeight: 20,
        marginTop: 8,
    },
    emptyCard: {
        backgroundColor: AppColors.card,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: AppColors.border,
        marginBottom: 18,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: AppColors.text,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: AppColors.mutedText,
        lineHeight: 21,
    },
    guideCard: {
        backgroundColor: AppColors.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    guideTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: AppColors.text,
        marginBottom: 6,
    },
    guideText: {
        fontSize: 14,
        color: AppColors.mutedText,
        lineHeight: 20,
    },
});