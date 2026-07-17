import { NavigateButton } from '@/components/navigate-button';
import { OfflineBanner } from '@/components/offline-banner';
import { AppColors } from '@/constants/colors';
import { Fonts, cardShadow } from '@/constants/ui';
import { useAuth } from '@/context/auth-context';
import { CacheKeys, fetchWithCache } from '@/services/cache';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
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
    buildingOrBlock: string;
    roomOrHall?: string;
    startIndex: number;
    endIndex: number;
    status: string;
};

function formatStatusLabel(status: string) {
    if (status === 'confirmed') return 'Confirmed';
    return 'Pending';
}

export default function ExamVenueSearchScreen() {
    const { token } = useAuth();
    const [allVenues, setAllVenues] = useState<ExamVenueRecord[]>([]);
    const [venuesReady, setVenuesReady] = useState(false);
    const [isOffline, setIsOffline] = useState(false);
    const [loadFailed, setLoadFailed] = useState(false);

    const [searchNumber, setSearchNumber] = useState('');
    const [matchedVenues, setMatchedVenues] = useState<ExamVenueRecord[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    // Download all exam venues once (network-first, cache fallback). Search then
    // runs locally against this list, so it works with no connection afterwards.
    const loadVenues = useCallback(async () => {
        try {
            const { data, fromCache } = await fetchWithCache<ExamVenueRecord[]>(
                CacheKeys.examVenues, '/exam-venues', token
            );
            setAllVenues(data);
            setIsOffline(fromCache);
            setLoadFailed(false);
        } catch {
            setLoadFailed(true);
        } finally {
            setVenuesReady(true);
        }
    }, [token]);

    useEffect(() => {
        loadVenues();
    }, [loadVenues]);

    function handleSearchVenue() {
        const cleanedNumber = searchNumber.trim();

        if (!cleanedNumber) {
            Alert.alert('Missing number', 'Please enter your index number.');
            return;
        }
        if (Number.isNaN(Number(cleanedNumber))) {
            Alert.alert('Invalid number', 'Please enter numbers only. Example: 6170524');
            return;
        }
        if (!venuesReady) {
            Alert.alert('Please wait', 'Exam data is still loading.');
            return;
        }

        const num = Number(cleanedNumber);
        const found = allVenues.filter((v) => num >= v.startIndex && num <= v.endIndex);
        setMatchedVenues(found);
        setHasSearched(true);
    }

    function handleClearSearch() {
        setSearchNumber('');
        setMatchedVenues([]);
        setHasSearched(false);
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
                    <Ionicons name="chevron-back" size={22} color={AppColors.text} />
                </TouchableOpacity>

                <Text style={styles.title}>Exam Venue Search</Text>
                <Text style={styles.subtitle}>
                    Enter your index number to find your exam venue. Works offline once downloaded.
                </Text>

                {isOffline && <OfflineBanner />}

                <View style={styles.searchCard}>
                    <Text style={styles.label}>Index / Reference Number</Text>
                    <TextInput
                        style={styles.input}
                        placeholderTextColor={AppColors.mutedText}
                        value={searchNumber}
                        onChangeText={setSearchNumber}
                        keyboardType="number-pad"
                    />

                    <TouchableOpacity
                        style={[styles.searchButton, !venuesReady && styles.disabledButton]}
                        onPress={handleSearchVenue}
                        disabled={!venuesReady}
                    >
                        {!venuesReady ? (
                            <ActivityIndicator color={AppColors.card} />
                        ) : (
                            <Text style={styles.searchButtonText}>Search Venue</Text>
                        )}
                    </TouchableOpacity>

                    {hasSearched && (
                        <TouchableOpacity style={styles.clearButton} onPress={handleClearSearch}>
                            <Text style={styles.clearButtonText}>Clear Search</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {loadFailed && allVenues.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>Exam data not downloaded</Text>
                        <Text style={styles.emptyText}>
                            Connect to the internet once to download exam venues. After that you can search offline.
                        </Text>
                    </View>
                ) : !hasSearched ? (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>Search for your exam venue</Text>
                        <Text style={styles.emptyText}>
                            Enter your index number to see your venue. Works offline once data is downloaded.
                        </Text>
                    </View>
                ) : null}

                {hasSearched && matchedVenues.length > 0 && (
                    <View style={styles.resultsSection}>
                        <Text style={styles.sectionTitle}>
                            {matchedVenues.length} matching venue
                            {matchedVenues.length === 1 ? '' : 's'} found
                        </Text>

                        {matchedVenues.map((venueRecord) => (
                            <View key={venueRecord.id} style={styles.resultCard}>
                                <View style={styles.resultHeader}>
                                    <Text style={styles.courseCode}>
                                        {venueRecord.courseCode}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.statusBadge,
                                            venueRecord.status === 'confirmed' &&
                                            styles.confirmedBadge,
                                        ]}
                                    >
                                        {formatStatusLabel(venueRecord.status)}
                                    </Text>
                                </View>

                                <Text style={styles.courseTitle}>
                                    {venueRecord.courseTitle}
                                </Text>

                                <View style={styles.infoBox}>
                                    <Text style={styles.infoLabel}>Exam Date</Text>
                                    <Text style={styles.infoValue}>
                                        {venueRecord.examDate}
                                    </Text>
                                </View>

                                <View style={styles.infoBox}>
                                    <Text style={styles.infoLabel}>Exam Time</Text>
                                    <Text style={styles.infoValue}>
                                        {venueRecord.examTime}
                                    </Text>
                                </View>

                                <View style={styles.infoBox}>
                                    <Text style={styles.infoLabel}>Venue</Text>
                                    <Text style={styles.infoValue}>
                                        {venueRecord.venue}
                                    </Text>
                                </View>

                                <View style={styles.infoBox}>
                                    <Text style={styles.infoLabel}>Building / Block</Text>
                                    <Text style={styles.infoValue}>
                                        {venueRecord.buildingOrBlock}
                                    </Text>
                                </View>

                                {venueRecord.roomOrHall && (
                                    <View style={styles.infoBox}>
                                        <Text style={styles.infoLabel}>Room / Hall</Text>
                                        <Text style={styles.infoValue}>
                                            {venueRecord.roomOrHall}
                                        </Text>
                                    </View>
                                )}

                                <View style={styles.rangeBox}>
                                    <Text style={styles.rangeLabel}>Index Range</Text>
                                    <Text style={styles.rangeValue}>
                                        {venueRecord.startIndex} - {venueRecord.endIndex}
                                    </Text>
                                </View>

                                <NavigateButton
                                    query={`${venueRecord.venue} ${venueRecord.buildingOrBlock}`}
                                />
                            </View>
                        ))}
                    </View>
                )}

                {hasSearched && matchedVenues.length === 0 && allVenues.length > 0 && (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyTitle}>No venue found</Text>
                        <Text style={styles.emptyText}>
                            No exam venue range matches this index or reference number yet.
                            Please check again later.
                        </Text>
                    </View>
                )}
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
    searchCard: {
        backgroundColor: AppColors.card,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: AppColors.border,
        marginBottom: 18,
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
        marginBottom: 16,
        fontSize: 15,
        color: AppColors.text,
        backgroundColor: AppColors.background,
        fontFamily: Fonts.body,
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
        fontFamily: Fonts.bodyBold,
    },
    disabledButton: {
        backgroundColor: AppColors.primaryDark,
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
        fontFamily: Fonts.bodyMedium,
    },
    resultsSection: {
        marginBottom: 18,
    },
    sectionTitle: {
        fontSize: 17,
        fontFamily: Fonts.headingSemi,
        color: AppColors.text,
        marginBottom: 10,
    },
    resultCard: {
        backgroundColor: AppColors.card,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: AppColors.border,
        marginBottom: 14,
    },
    resultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        gap: 10,
    },
    courseCode: {
        color: AppColors.primary,
        fontSize: 13,
        fontFamily: Fonts.bodyBold,
    },
    statusBadge: {
        backgroundColor: AppColors.warning,
        color: AppColors.card,
        fontSize: 11,
        fontFamily: Fonts.bodyBold,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        overflow: 'hidden',
        textTransform: 'uppercase',
    },
    confirmedBadge: {
        backgroundColor: AppColors.success,
    },
    courseTitle: {
        color: AppColors.text,
        fontSize: 18,
        fontFamily: Fonts.headingSemi,
        marginBottom: 14,
    },
    infoBox: {
        backgroundColor: AppColors.background,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: AppColors.border,
        padding: 12,
        marginBottom: 10,
    },
    infoLabel: {
        fontSize: 12,
        color: AppColors.mutedText,
        fontFamily: Fonts.bodyMedium,
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 14,
        color: AppColors.text,
        fontFamily: Fonts.bodyBold,
        lineHeight: 20,
    },
    rangeBox: {
        backgroundColor: AppColors.primary,
        borderRadius: 12,
        padding: 12,
        marginTop: 2,
    },
    rangeLabel: {
        fontSize: 12,
        color: AppColors.accent,
        fontFamily: Fonts.bodyBold,
        marginBottom: 4,
    },
    rangeValue: {
        fontSize: 15,
        color: AppColors.card,
        fontFamily: Fonts.bodyBold,
    },
    emptyCard: {
        backgroundColor: AppColors.card,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: AppColors.border,
        marginBottom: 18,
        ...cardShadow,
    },
    emptyTitle: {
        fontSize: 18,
        fontFamily: Fonts.headingSemi,
        color: AppColors.text,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: AppColors.mutedText,
        lineHeight: 21,
        fontFamily: Fonts.body,
    },
});