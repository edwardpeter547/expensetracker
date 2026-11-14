import { PasswordRecoveryContext } from '@/contexts/PasswordRecoveryContext';
import { useContext } from 'react';

/**
 * Read the in-memory password-recovery state and mutations.
 *
 * @returns The recovery context value.
 */
export const usePasswordRecovery = () => {
    const context = useContext(PasswordRecoveryContext);
    if (!context) {
        throw new Error('usePasswordRecovery must be used within PasswordRecoveryProvider');
    }
    return context;
};
