import { Platform, ViewStyle } from 'react-native';

// Soft card shadow used across the redesigned screens.
export const cardShadow: ViewStyle = (Platform.select({
    ios: {
        shadowColor: '#0B2A1A',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 2 },
    default: {},
}) ?? {}) as ViewStyle;

export const radii = {
    sm: 12,
    md: 14,
    lg: 18,
};
