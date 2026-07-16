import { AppColors } from '@/constants/colors';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { registerForPushNotifications } from '@/services/notifications';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

function RootNavigator() {
  const { token, role, isLoading } = useAuth();

  // Once signed in, register this device for remote push (no-op in Expo Go).
  useEffect(() => {
    if (token) {
      registerForPushNotifications(token);
    }
  }, [token]);

  // Wait for the stored session to load before deciding what is reachable,
  // otherwise a logged-in user would briefly see the login screen on launch.
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: AppColors.background }}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  const isAuthenticated = !!token;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Auth screens — reachable when signed out */}
      <Stack.Screen name="index" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />

      {/* Any signed-in user */}
      <Stack.Protected guard={isAuthenticated}>
        {/* Student screens */}
        <Stack.Screen name="student-dashboard" />
        <Stack.Screen name="profile-settings" />
        <Stack.Screen name="paywall" />
        <Stack.Screen name="timetable" />
        <Stack.Screen name="announcements" />
        <Stack.Screen name="assignments" />
        <Stack.Screen name="exam-venue-search" />
        <Stack.Screen name="my-scores" />

        {/* Course rep screens */}
        <Stack.Screen name="rep-panel" />
        <Stack.Screen name="post-announcement" />
        <Stack.Screen name="add-assignment" />
        <Stack.Screen name="manage-timetable" />
        <Stack.Screen name="manage-exam-venues" />
        <Stack.Screen name="upload-score" />
      </Stack.Protected>

      {/* Admin only */}
      <Stack.Protected guard={isAuthenticated && role === 'admin'}>
        <Stack.Screen name="admin-panel" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
