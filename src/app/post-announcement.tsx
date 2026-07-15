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

type AnnouncementCategory =
    | 'General'
    | 'Class Update'
    | 'Venue Change'
    | 'Assignment'
    | 'Exam';

const categories: AnnouncementCategory[] = [
    'General',
    'Class Update',
    'Venue Change',
    'Assignment',
    'Exam',
];

export default function PostAnnouncementScreen() {
    const { token } = useAuth();
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState<AnnouncementCategory>('General');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handlePostAnnouncement = async () => {
        const cleanedTitle = title.trim();
        const cleanedMessage = message.trim();

        if (!cleanedTitle || !cleanedMessage) {
            Alert.alert('Missing details', 'Please enter the announcement title and message.');
            return;
        }

        if (cleanedTitle.length < 3) {
            Alert.alert('Title too short', 'Please enter a clearer title.');
            return;
        }

        if (cleanedMessage.length < 10) {
            Alert.alert('Message too short', 'Please enter a more detailed announcement message.');
            return;
        }

        try {
            setIsSubmitting(true);
            await apiRequest('/announcements', {
                method: 'POST',
                token,
                body: { title: cleanedTitle, message: cleanedMessage, category },
            });

            Alert.alert('Announcement posted', 'Students can now see your announcement.', [
                { text: 'OK', onPress: () => router.back() },
            ]);

            setTitle('');
            setCategory('General');
            setMessage('');
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

                    <Text style={styles.title}>Post Announcement</Text>
                    <Text style={styles.subtitle}>
                        Create a clear academic update for students in your class.
                    </Text>

                    <View style={styles.formCard}>
                        <Text style={styles.label}>Title</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Example: CSM 281 class postponed"
                            placeholderTextColor={AppColors.mutedText}
                            value={title}
                            onChangeText={setTitle}
                        />

                        <Text style={styles.label}>Category</Text>
                        <View style={styles.categoryList}>
                            {categories.map((item) => (
                                <TouchableOpacity
                                    key={item}
                                    style={[
                                        styles.categoryButton,
                                        category === item && styles.activeCategoryButton,
                                    ]}
                                    onPress={() => setCategory(item)}
                                >
                                    <Text
                                        style={[
                                            styles.categoryText,
                                            category === item && styles.activeCategoryText,
                                        ]}
                                    >
                                        {item}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Message</Text>
                        <TextInput
                            style={styles.messageInput}
                            placeholder="Write the full announcement here..."
                            placeholderTextColor={AppColors.mutedText}
                            value={message}
                            onChangeText={setMessage}
                            multiline
                            textAlignVertical="top"
                        />

                        <TouchableOpacity
                            style={[styles.postButton, isSubmitting && styles.disabledButton]}
                            onPress={handlePostAnnouncement}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color={AppColors.card} />
                            ) : (
                                <Text style={styles.postButtonText}>Post Announcement</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.noteCard}>
                        <Text style={styles.noteTitle}>Posting guide</Text>
                        <Text style={styles.noteText}>
                            Keep announcements short, clear, and academic. Include the course
                            code, venue, date, and time when needed.
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
    categoryList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 18,
    },
    categoryButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 18,
        backgroundColor: AppColors.background,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    activeCategoryButton: {
        backgroundColor: AppColors.primary,
        borderColor: AppColors.primary,
    },
    categoryText: {
        color: AppColors.mutedText,
        fontSize: 13,
        fontWeight: '700',
    },
    activeCategoryText: {
        color: AppColors.card,
    },
    messageInput: {
        minHeight: 150,
        borderWidth: 1,
        borderColor: AppColors.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 20,
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
    postButtonText: {
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
});