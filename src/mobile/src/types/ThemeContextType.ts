import { ColorScheme } from "./ColorScheme";
import { THEMES } from "./Colors";

export type ThemeName = keyof typeof THEMES;

export interface ThemeContextType {
    theme: ThemeName;
    setTheme: (theme: ThemeName) => void;
    colors: ColorScheme
}