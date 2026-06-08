import { AppColors } from '@/constants/colors';
import { StyleSheet, Text, View } from 'react-native';

export default function RepPanel() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Course Rep Panel</Text>
            <Text style={styles.text}>Welcome, Course Representative.</Text>
            <Text style={styles.text}>
                Here you will manage timetable, announcements, assignments, and exam records.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        backgroundColor: AppColors.background,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: AppColors.primary,
        marginBottom: 12,
    },
    text: {
        fontSize: 16,
        color: AppColors.mutedText,
        marginBottom: 8,
    },
});