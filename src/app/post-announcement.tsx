import { AppColors } from '@/constants/colors';
import { Fonts, cardShadow } from '@/constants/ui';
import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
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

// react-native-web's Alert.alert() is a no-op stub — it never renders a
// dialog or fires button callbacks on web. Without this, validation errors
// and the post-success confirmation (whose "OK" button triggers the
// navigate-back) silently do nothing on web, making a working post look
// identical to a failed one.
function notify(title: string, message?: string, onDismiss?: () => void) {
    if (Platform.OS === 'web') {
        window.alert(message ? `${title}\n\n${message}` : title);
        onDismiss?.();
        return;
    }
    Alert.alert(title, message, onDismiss ? [{ text: 'OK', onPress: onDismiss }] : undefined);
}

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
            notify('Missing details', 'Please enter the announcement title and message.');
            return;
        }

        if (cleanedTitle.length < 3) {
            notify('Title too short', 'Please enter a clearer title.');
            return;
        }

        if (cleanedMessage.length < 10) {
            notify('Message too short', 'Please enter a more detailed announcement message.');
            return;
        }

        try {
            setIsSubmitting(true);
            await apiRequest('/announcements', {
                method: 'POST',
                token,
                body: { title: cleanedTitle, message: cleanedMessage, category, targetClassGroup: 'ALL' },
            });

            setTitle('');
            setCategory('General');
            setMessage('');

            notify('Announcement posted successfully', 'Students can now see your announcement.', () => router.back());
        } catch (e) {
            notify('Could not post', e instanceof Error ? e.message : 'Please try again.');
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
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
                        <Ionicons name="chevron-back" size={22} color={AppColors.text} />
                    </TouchableOpacity>

                    <Text style={styles.title}>Post Announcement</Text>
                    <Text style={styles.subtitle}>
                        Create a clear academic update for students in your class.
                    </Text>

                    <View style={styles.formCard}>
                        <Text style={styles.label}>Title</Text>
                        <TextInput
                            style={styles.input}
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
        fontFamily: Fonts.bodyMedium,
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
        fontFamily: Fonts.body,
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
        fontFamily: Fonts.bodyBold,
    },
    disabledButton: {
        backgroundColor: AppColors.primaryDark,
    },
});