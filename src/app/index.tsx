import { AppColors } from '@/constants/colors';
import { API_BASE_URL as API_URL } from '@/constants/config';
import { homeRouteForRole, useAuth, type LoginResponse } from '@/context/auth-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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

export default function LoginScreen() {
  const { token, role, isLoading: isRestoringSession, signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.logo}>
          <Text style={styles.logoC}>C</Text>
          <View style={styles.logoDot} />
        </View>
        <Text style={styles.appName}>ClassMate</Text>

        <Text style={styles.heading}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to your academic dashboard.</Text>

        <Text style={styles.label}>Email or index number</Text>
        <View style={styles.field}>
          <Ionicons name="person-outline" size={18} color={AppColors.mutedText} />
          <TextInput
            style={styles.input}
            placeholder="e.g. 6170524 or you@st.knust.edu.gh"
            placeholderTextColor={AppColors.mutedText}
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <Text style={styles.label}>Password</Text>
        <View style={styles.field}>
          <Ionicons name="lock-closed-outline" size={18} color={AppColors.mutedText} />
          <TextInput
            style={styles.input}
            placeholder="Your password"
            placeholderTextColor={AppColors.mutedText}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={AppColors.mutedText} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.forgot} onPress={() => router.push('/forgot-password')}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, isLoading && styles.disabledButton]} onPress={handleLogin} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color={AppColors.card} /> : <Text style={styles.buttonText}>Log in</Text>}
        </TouchableOpacity>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>New here?</Text>
          <TouchableOpacity onPress={() => router.push('/register')}>
            <Text style={styles.footerLink}>Create an account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  logo: {
    width: 64, height: 64, borderRadius: 18, backgroundColor: AppColors.primary,
    justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 14,
  },
  logoC: { color: AppColors.card, fontSize: 32, fontWeight: '800' },
  logoDot: {
    position: 'absolute', top: 12, right: 12, width: 10, height: 10, borderRadius: 5,
    backgroundColor: AppColors.accent,
  },
  appName: { fontSize: 20, fontWeight: '800', color: AppColors.primary, textAlign: 'center', marginBottom: 28 },
  heading: { fontSize: 26, fontWeight: '800', color: AppColors.text },
  subtitle: { fontSize: 15, color: AppColors.mutedText, marginTop: 4, marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '700', color: AppColors.text, marginBottom: 8 },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: 10, height: 54,
    borderWidth: 1, borderColor: AppColors.border, borderRadius: 14, paddingHorizontal: 14,
    marginBottom: 16, backgroundColor: AppColors.card,
  },
  input: { flex: 1, fontSize: 15, color: AppColors.text },
  forgot: { alignSelf: 'flex-end', marginTop: -4, marginBottom: 20 },
  forgotText: { fontSize: 13, fontWeight: '700', color: AppColors.primary },
  button: {
    height: 54, backgroundColor: AppColors.primary, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  disabledButton: { backgroundColor: AppColors.primaryDark },
  buttonText: { color: AppColors.card, fontSize: 16, fontWeight: '800' },
  footerRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 22 },
  footerText: { fontSize: 14, color: AppColors.mutedText },
  footerLink: { fontSize: 14, fontWeight: '800', color: AppColors.primary },
});
