import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { deleteItem, getItem, setItem } from '@/services/storage';

export type UserRole = 'student' | 'course_rep' | 'admin';

export type AuthUser = {
    id: number;
    fullName: string;
    email: string;
    role: UserRole;
    indexNumber?: string;
    referenceNumber?: string;
    programme?: string;
    level?: string;
};

export type LoginResponse = {
    token: string;
    user: AuthUser;
};

type AuthContextValue = {
    token: string | null;
    role: UserRole | null;
    isLoading: boolean;
    signIn: (data: LoginResponse) => Promise<void>;
    signOut: () => Promise<void>;
};

// Every persisted session key, kept in one place so sign-out can clear them all.
const SESSION_KEYS = [
    'authToken',
    'userId',
    'userName',
    'userEmail',
    'userRole',
    'indexNumber',
    'referenceNumber',
    'programme',
    'level',
] as const;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Landing route for each role after a successful sign-in.
export function homeRouteForRole(role: UserRole | null): '/student-dashboard' | '/rep-panel' | '/admin-panel' {
    if (role === 'admin') return '/admin-panel';
    if (role === 'course_rep') return '/rep-panel';
    return '/student-dashboard';
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(null);
    const [role, setRole] = useState<UserRole | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Restore any existing session on app launch.
    useEffect(() => {
        (async () => {
            try {
                const storedToken = await getItem('authToken');
                const storedRole = (await getItem('userRole')) as UserRole | null;
                setToken(storedToken);
                setRole(storedRole);
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    const value = useMemo<AuthContextValue>(() => ({
        token,
        role,
        isLoading,
        signIn: async (data: LoginResponse) => {
            const { token: newToken, user } = data;
            await setItem('authToken', newToken);
            await setItem('userId', String(user.id));
            await setItem('userName', user.fullName);
            await setItem('userEmail', user.email);
            await setItem('userRole', user.role);
            if (user.indexNumber) await setItem('indexNumber', user.indexNumber);
            if (user.referenceNumber) await setItem('referenceNumber', user.referenceNumber);
            if (user.programme) await setItem('programme', user.programme);
            if (user.level) await setItem('level', user.level);

            setToken(newToken);
            setRole(user.role);
        },
        signOut: async () => {
            for (const key of SESSION_KEYS) {
                await deleteItem(key);
            }
            setToken(null);
            setRole(null);
        },
    }), [token, role, isLoading]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
