/**
 * In-memory password-recovery context.
 *
 * Holds the account email and the verified OTP only for the lifetime of the
 * running app session. No recovery credential is written to AsyncStorage or
 * any other persistent store, and the state resets automatically on restart.
 */

import { createContext, ReactNode, useMemo, useState } from 'react';

interface PasswordRecoveryState {
    email: string | null;
    verifiedCode: string | null;
}

interface PasswordRecoveryContextValue extends PasswordRecoveryState {
    beginRecovery: (email: string) => void;
    completeVerification: (code: string) => void;
    clearRecovery: () => void;
}

export const PasswordRecoveryContext = createContext<PasswordRecoveryContextValue | undefined>(undefined);

/**
 * Provide in-memory state for the forgot-password → OTP → reset flow.
 *
 * @param {{children: ReactNode}} props Provider props.
 * @returns {JSX.Element} The provider.
 */
export const PasswordRecoveryProvider = ({ children }: { children: ReactNode }) => {
    const [state, setState] = useState<PasswordRecoveryState>({
        email: null,
        verifiedCode: null,
    });

    const value = useMemo<PasswordRecoveryContextValue>(() => ({
        email: state.email,
        verifiedCode: state.verifiedCode,
        beginRecovery: (email: string) => setState({ email, verifiedCode: null }),
        completeVerification: (code: string) => setState((current) => ({
            ...current,
            verifiedCode: code,
        })),
        clearRecovery: () => setState({ email: null, verifiedCode: null }),
    }), [state]);

    return (
        <PasswordRecoveryContext.Provider value={value}>
            {children}
        </PasswordRecoveryContext.Provider>
    );
};
