import { apiClient, clearStoredTokens, readStoredTokens, setAccessToken, storeTokens } from '@/api/client';
import { useLocale } from '@/contexts/LocaleContext';
import { createContext, ReactNode, useEffect, useState } from "react";



interface User {
    id: number;
    email: string;
    username: string;
    firstname: string;
    lastname: string;
    language?: string;
    currency?: string;
}


interface RegisterData {
    email: string;
    username: string;
    password: string;
    firstName: string;
    lastName: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => Promise<void>;
}



export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({children}: {children: ReactNode}) => {

    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { language, currency, applyRemotePreferences } = useLocale();

    useEffect(() => {
        const loadTokens = async () => {
            try{
                const { accessToken, refreshToken } = await readStoredTokens();

                if(accessToken && refreshToken){
                    setAccessToken(accessToken);

                    // fetch user profile to verify token is still valid
                    const response = await apiClient.get('/user/profile');
                    const profile = response.data.data.profile;
                    setUser(profile);
                    applyRemotePreferences(profile.language, profile.currency);
                }
            }
            catch{
                // Token has expired
                await clearStoredTokens();
            }
            finally{
                setIsLoading(false);
            }
        }

        loadTokens();
    }, [applyRemotePreferences]);


    const login = async (email: string, password: string) => {
        const response = await apiClient.post("/auth/login", { email, password });
        const {user, accessToken, refreshToken} = response.data.data;

        await storeTokens(accessToken, refreshToken);
        setUser(user);
        applyRemotePreferences(user.language, user.currency);
    }

    const register = async(data: RegisterData) => {
        const response = await apiClient.post('/auth/register', {
            ...data,
            language,
            currency,
        });
        const { user, accessToken, refreshToken } = response.data.data;

        await storeTokens(accessToken, refreshToken);
        setUser(user);
        applyRemotePreferences(user.language, user.currency);
    }

    const logout = async () => {
        try{
            const { refreshToken } = await readStoredTokens();
            await apiClient.post('/auth/logout', {refreshToken});
        }
        catch{

        }

        await clearStoredTokens();
        setUser(null);
    }

    return <AuthContext.Provider value={{user, isLoading, login, register, logout}}>
        {children}
    </AuthContext.Provider>
}

