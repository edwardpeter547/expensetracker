import useStyles from "@/hooks/useStyles";
import { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";

interface Props {
    children: ReactNode
}

const KeyboardAvoidWrapper = ({children} : Props) => {

    const styles = useStyles("components");

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS == "ios" ? "padding": "height"}
            style={styles.keyboardContainer}
        >
            <ScrollView
                contentContainerStyle={styles.keyboardScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {children}
            </ScrollView>
        </KeyboardAvoidingView>
    )
}


export default KeyboardAvoidWrapper;