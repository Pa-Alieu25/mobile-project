import { useAuth } from '@/context/auth-context';
import { useConfirm } from '@/context/confirm-context';
import { router } from 'expo-router';
import { useCallback } from 'react';

/**
 * Returns a function that confirms with the user before signing out, using
 * the app's own styled dialog (ConfirmProvider) so it looks the same on
 * every platform. Use this from every sign-out button so the confirmation
 * prompt (and post-sign-out navigation) stays consistent across the app.
 */
export function useSignOut() {
    const { signOut } = useAuth();
    const confirm = useConfirm();

    return useCallback(async () => {
        const confirmed = await confirm({
            title: 'Sign Out',
            message: 'Are you sure you want to sign out?',
            confirmText: 'Sign Out',
            cancelText: 'Cancel',
            destructive: true,
        });
        if (!confirmed) return;

        await signOut();
        router.replace('/');
    }, [signOut, confirm]);
}
