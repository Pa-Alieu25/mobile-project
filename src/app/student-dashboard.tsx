import { View, Text, StyleSheet } from 'react-native';

export default function StudentDashboard() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Student Dashboard</Text>
            <Text style={styles.text}>Welcome to KNUST ClassMate.</Text>
            <Text style={styles.text}>Here you will see timetable, announcements, assignments, and exam venues.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        backgroundColor: '#ffffff',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1e3a8a',
        marginBottom: 12,
    },
    text: {
        fontSize: 16,
        color: '#4b5563',
        marginBottom: 8,
    },
});