import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Platform-aware key/value storage.
// Native uses expo-secure-store (encrypted); web falls back to localStorage,
// since SecureStore is not available in the browser.

export async function setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
    } else {
        await SecureStore.setItemAsync(key, value);
    }
}

export async function getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
        return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
}

export async function deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
        localStorage.removeItem(key);
    } else {
        await SecureStore.deleteItemAsync(key);
    }
}
