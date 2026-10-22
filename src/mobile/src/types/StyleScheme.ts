import authStyles from "@/constants/auth.styles";
import componentStyles from "@/constants/components.styles";
import createStyles from "@/constants/create.styles";
import generalStyles from "@/constants/general.styles";
import homeStyles from "@/constants/home.styles";

export const StyleScheme = {
    auth: authStyles,
    create: createStyles,
    home: homeStyles,
    general: generalStyles,
    components: componentStyles,
}

export type StyleSelector = keyof typeof StyleScheme;