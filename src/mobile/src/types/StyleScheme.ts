import authStyles from "@/constants/auth.styles";
import authFormStyles from "@/constants/authForm.styles";
import componentStyles from "@/constants/components.styles";
import createStyles from "@/constants/create.styles";
import generalStyles from "@/constants/general.styles";
import homeStyles from "@/constants/home.styles";
import welcomeStyles from "@/constants/welcome.styles";

export const StyleScheme = {
    auth: authStyles,
    authForm: authFormStyles,
    create: createStyles,
    home: homeStyles,
    general: generalStyles,
    components: componentStyles,
    welcome: welcomeStyles,
}

export type StyleSelector = keyof typeof StyleScheme;
