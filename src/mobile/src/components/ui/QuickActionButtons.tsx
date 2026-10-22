import useTheme from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';


interface QuickActionButtonsProps {
    onIncomePress: () => void;
    onExpensePress: () => void;
    showForm: boolean;
    activeType: "INCOME" | "EXPENSE";
}

const QuickActionButtons = ({onIncomePress, onExpensePress, showForm, activeType }: QuickActionButtonsProps) => {

    const { colors } = useTheme();

    return (
        <View style={[styles.container, {marginBottom: showForm ? 16 : 20}]}>
            <TouchableOpacity 
                onPress={onIncomePress} 
                style={[
                    styles.button, 
                    {
                        backgroundColor: colors.income,
                        opacity: showForm && activeType === "INCOME" ? 1 : 0.8
                    }
                ]}
            >
                <Ionicons name='add-circle' size={22} color={colors.white} />
                <Text style={[styles.text, {color: colors.white}]}>Income</Text>
            </TouchableOpacity>
            <TouchableOpacity
                onPress={onExpensePress}
                style={[
                    styles.button,
                    {
                        backgroundColor: colors.expense,
                        opacity: showForm && activeType === "EXPENSE" ? 1 : 0.8
                    }
                ]}
            >
                <Ionicons name="remove-circle" size={22} color={colors.white} />
                <Text style={[styles.text, {color: colors.white}]}>Expense</Text>
            </TouchableOpacity>
        </View>
    )
}


const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        gap: 12,
    },

    button: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 14,
        borderRadius: 12,
        gap: 8,
    },

    text: {
        fontWeight: "700",
        fontSize: 16
    }
})


export default QuickActionButtons;

