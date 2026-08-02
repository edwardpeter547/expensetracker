import { THEMES } from "@/types/Colors";
import { ThemeContextType, ThemeName } from "@/types/ThemeContextType";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, ReactNode, useEffect, useState } from "react";


export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);


export const ThemeProvider = ({children}: {children: ReactNode}) => {

    const [theme, setThemeState] = useState<ThemeName>('coffee');

    useEffect(() => {

        const loadTheme = async () => {
            const value = await AsyncStorage.getItem('theme');
            if(value){
                setThemeState(value as ThemeName);
            }
        }

        loadTheme();
        
    }, []);

    const setTheme = async (theme: ThemeName) => {
        setThemeState(theme);
        await AsyncStorage.setItem('theme', theme);
    }

    const colors = THEMES[theme];

    return <ThemeContext.Provider value={{colors, theme, setTheme}}>
        {children}
    </ThemeContext.Provider>
}