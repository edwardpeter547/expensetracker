import { apiClient } from '@/api/client';
import * as SecureStore from 'expo-secure-store';
import { createContext, ReactNode, useEffect, useState } from "react";



interface User {
    id: number;
    email: string;
    username: string;
    firstname: string;
    lastname: string;
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

    useEffect(() => {
        const loadTokens = async () => {
            try{
                const accessToken = await SecureStore.getItemAsync('accessToken');
                const refreshToken = await SecureStore.getItemAsync('refreshToken');

                if(accessToken && refreshToken){
                    // Set default header
                    apiClient.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
                    console.log(`Here is the access token: ${accessToken}`);

                    // fetch user profile to verify token is still valid
                    const response = await apiClient.get('/user/profile');
                    console.log("This is the data", JSON.stringify(response.data.data));
                    setUser(response.data.data);
                }
            }
            catch(error){
                // Token has expired
                await SecureStore.deleteItemAsync('accessToken');
                await SecureStore.deleteItemAsync('refreshToken');
            }
            finally{
                setIsLoading(false);
            }
        }

        loadTokens();
    }, []);


    const login = async (email: string, password: string) => {
        const response = await apiClient.post("/auth/login", { email, password });
        const {user, accessToken, refreshToken} = response.data.data;

        // Lets store the auth loadTokens
        await SecureStore.setItemAsync('accessToken', accessToken);
        await SecureStore.setItemAsync('refreshToken', refreshToken);

        apiClient.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
        setUser(user);
    }

    const register = async(data: RegisterData) => {
        const response = await apiClient.post('/auth/register', data);
        const { user, accessToken, refreshToken } = response.data.data;

        await SecureStore.setItemAsync('accessToken', accessToken);
        await SecureStore.setItemAsync('refreshToken', refreshToken);

        apiClient.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
        setUser(user);
    }

    const logout = async () => {
        try{
            const refreshToken = await SecureStore.getItemAsync('refreshToken');
            const response = await apiClient.post('/auth/logout', {refreshToken});
        }
        catch(error){

        }

        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        delete apiClient.defaults.headers.common["Authorization"];
        setUser(null);
    }

    return <AuthContext.Provider value={{user, isLoading, login, register, logout}}>
        {children}
    </AuthContext.Provider>
}

