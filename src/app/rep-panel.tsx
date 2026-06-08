import { View, Text, StyleSheet } from 'react-native';

export default function RepPanel() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Course Rep Panel</Text>
            <Text style={styles.text}>Welcome, Course Representative.</Text>
            <Text style={styles.text}>Here you will manage timetable, announcements, assignments, and exam records.</Text>
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
        color: '#7c2d12',
        marginBottom: 12,
    },
    text: {
        fontSize: 16,
        color: '#4b5563',
        marginBottom: 8,
    },
});