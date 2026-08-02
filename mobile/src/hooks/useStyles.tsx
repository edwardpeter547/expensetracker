import { StyleScheme, StyleSelector } from "@/types/StyleScheme";


const useStyles = <T extends StyleSelector>(styleScheme: T): ReturnType<typeof StyleScheme[T]> => {
    const styleGenerator = StyleScheme[styleScheme];
    const stylesheet = styleGenerator();
    return stylesheet as ReturnType<typeof StyleScheme[T]>;
};

export default useStyles;

