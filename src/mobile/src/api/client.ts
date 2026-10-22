import axios from 'axios';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { getBaseUrl } from './config';

const API_BASE_URL = getBaseUrl();


export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});


apiClient.interceptors.response.use(

    (response) => response,
    async (error) => {
        if(error.response?.status === 401) {
            const refreshToken = await SecureStore.getItemAsync("refreshToken");

            if(refreshToken){
                try {
                    const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {refreshToken});
                    const {accessToken, refreshToken: newRefresh } = response.data.data;

                    await SecureStore.setItemAsync("accessToken", accessToken);
                    await SecureStore.setItemAsync("refreshToken", newRefresh);

                    error.config.headers.Authorization = `Bearer ${accessToken}`;
                    return axios(error.config);
                }
                catch(error){
                    // Refresh failed - force logout
                    await SecureStore.deleteItemAsync("accessToken");
                    await SecureStore.deleteItemAsync("refreshToken");
                    router.replace("/(auth)/login");
                }
            }else{
                router.replace("/(auth)/login");
            }
        }
        return Promise.reject(error);
    }
)