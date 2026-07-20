import { AppColors } from '@/constants/colors';
import { cardShadow, Fonts, radii } from '@/constants/ui';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type ConfirmOptions = {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
};

type ConfirmContextValue = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

// Renders one shared confirm dialog, styled to match the app rather than the
// OS/browser's default alert, so every screen that needs a yes/no prompt
// (e.g. sign-out) looks and behaves the same.
export function ConfirmProvider({ children }: { children: ReactNode }) {
    const [options, setOptions] = useState<ConfirmOptions | null>(null);
    const resolveRef = useRef<(value: boolean) => void>(undefined);

    const confirm = useCallback((opts: ConfirmOptions) => {
        setOptions(opts);
        return new Promise<boolean>((resolve) => {
            resolveRef.current = resolve;
        });
    }, []);

    const close = useCallback((result: boolean) => {
        setOptions(null);
        resolveRef.current?.(result);
        resolveRef.current = undefined;
    }, []);

    const value = useMemo(() => confirm, [confirm]);

    return (
        <ConfirmContext.Provider value={value}>
            {children}
            <Modal visible={!!options} transparent animationType="fade" onRequestClose={() => close(false)}>
                <Pressable style={styles.backdrop} onPress={() => close(false)}>
                    <Pressable style={[styles.card, cardShadow]} onPress={(e) => e.stopPropagation()}>
                        <Text style={styles.title}>{options?.title}</Text>
                        <Text style={styles.message}>{options?.message}</Text>
                        <View style={styles.actions}>
                            <Pressable style={[styles.button, styles.cancelButton]} onPress={() => close(false)}>
                                <Text style={styles.cancelText}>{options?.cancelText ?? 'Cancel'}</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.button, options?.destructive ? styles.destructiveButton : styles.confirmButton]}
                                onPress={() => close(true)}
                            >
                                <Text style={styles.confirmText}>{options?.confirmText ?? 'Confirm'}</Text>
                            </Pressable>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </ConfirmContext.Provider>
    );
}

export function useConfirm(): ConfirmContextValue {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return context;
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 20, 0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    card: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: AppColors.card,
        borderRadius: radii.lg,
        padding: 24,
    },
    title: {
        fontSize: 18,
        fontFamily: Fonts.heading,
        color: AppColors.text,
        marginBottom: 8,
    },
    message: {
        fontSize: 15,
        fontFamily: Fonts.body,
        color: AppColors.mutedText,
        lineHeight: 21,
        marginBottom: 24,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    button: {
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: radii.sm,
    },
    cancelButton: {
        backgroundColor: AppColors.background,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    cancelText: {
        color: AppColors.text,
        fontFamily: Fonts.bodyMedium,
        fontSize: 14,
    },
    confirmButton: {
        backgroundColor: AppColors.primary,
    },
    destructiveButton: {
        backgroundColor: AppColors.danger,
    },
    confirmText: {
        color: AppColors.card,
        fontFamily: Fonts.bodyMedium,
        fontSize: 14,
    },
});
