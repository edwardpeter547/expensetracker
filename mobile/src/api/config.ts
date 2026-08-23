import { Platform } from "react-native";
import Constants from 'expo-constants';
import {isDevice, } from 'expo-device';


const getMacIP = () => {
    return process.env.EXPO_PUBLIC_MAC_IP || '192.168.0.193';
};



export const getBaseUrl = () => {

    const apiUrl = Constants.expoConfig?.extra?.apiUrl;

    if(__DEV__) {
        
        if (Platform.OS === 'ios' && !isDevice) {
            return `https://localhost:${process.env.LOCAL_SERVER_PORT}/api/v1`;
        }

        if (Platform.OS === 'android' && !isDevice) {
            console.log('second place');
            return `https://localhost:${process.env.LOCAL_SERVER_PORT}/api/v1`;
        }
        return apiUrl;
    }

    
    return apiUrl;
}