import { AppColors } from '@/constants/colors';
import { API_BASE_URL as API_URL } from '@/constants/config';
import { homeRouteForRole, useAuth, type LoginResponse } from '@/context/auth-context';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function LoginScreen() {
  const { token, role, isLoading: isRestoringSession, signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect to the correct home once authenticated — covers both a fresh
  // login and a restored session on app launch.
  useEffect(() => {
    if (!isRestoringSession && token) {
      router.replace(homeRouteForRole(role));
    }
  }, [isRestoringSession, token, role]);

  const handleLogin = async () => {
    const cleanedIdentifier = identifier.trim();
    const cleanedPassword = password.trim();

    if (!cleanedIdentifier || !cleanedPassword) {
      Alert.alert('Missing details', 'Please enter your index number, reference number, or email and password.');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanedIdentifier, password: cleanedPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        Alert.alert('Login failed', errorData?.message || 'Invalid credentials. Please try again.');
        return;
      }

      const data: LoginResponse = await response.json();
      await signIn(data);
      // Navigation is handled by the effect above once auth state updates.
    } catch (error) {
      Alert.alert('Connection error', 'Unable to connect to the server. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.content}>
        <Text style={styles.title}>ClassMate</Text>
        <Text style={styles.subtitle}>Sign in to your academic dashboard</Text>

        <TextInput style={styles.input} placeholder="Index Number / Reference Number / Email" placeholderTextColor={AppColors.mutedText} value={identifier} onChangeText={setIdentifier} autoCapitalize="none" autoCorrect={false} />
        <TextInput style={styles.input} placeholder="Password" placeholderTextColor={AppColors.mutedText} value={password} onChangeText={setPassword} secureTextEntry />

        <TouchableOpacity style={[styles.button, isLoading && styles.disabledButton]} onPress={handleLogin} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color={AppColors.card} /> : <Text style={styles.buttonText}>Sign In</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/register')}>
          <Text style={styles.linkText}>Create a new account</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/forgot-password')}>
          <Text style={styles.secondaryLink}>Forgot password?</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  title: { fontSize: 36, fontWeight: 'bold', color: AppColors.primary, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: AppColors.mutedText, marginBottom: 32, textAlign: 'center' },
  input: { height: 52, borderWidth: 1, borderColor: AppColors.border, borderRadius: 10, paddingHorizontal: 16, marginBottom: 16, fontSize: 16, backgroundColor: AppColors.card, color: AppColors.text },
  button: { height: 52, backgroundColor: AppColors.primary, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  disabledButton: { backgroundColor: AppColors.primaryDark },
  buttonText: { color: AppColors.card, fontSize: 16, fontWeight: '700' },
  linkText: { marginTop: 22, textAlign: 'center', color: AppColors.primary, fontSize: 15, fontWeight: '600' },
  secondaryLink: { marginTop: 12, textAlign: 'center', color: AppColors.mutedText, fontSize: 14, fontWeight: '500' },
});
