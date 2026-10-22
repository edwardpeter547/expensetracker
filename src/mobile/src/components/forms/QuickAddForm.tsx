import { apiClient } from "@/api/client";
import useStyles from "@/hooks/useStyles";
import useTheme from "@/hooks/useTheme";
import { Ionicons } from '@expo/vector-icons';
import { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import InputField from "../ui/Input";


const INCOME_CATEGORIES = ["Salary", "Investment", "Freelancing", "Gifts", "Bonus", ]
const EXPENSE_CATEGORIES = ["Food", "Transport", "Shopping", "Bills", "Entertainment", "Health"];


interface QuickAddFormProps {
    formType: "INCOME" | "EXPENSE";
    onClose: () => void;
    onSuccess: () => void;
}


const QuickAddForm = ({formType, onClose, onSuccess} : QuickAddFormProps) => {

    const { colors } = useTheme();
    const homeStyles = useStyles("home");
    const authStyles = useStyles("auth");

    const [amount, setAmount] = useState<string>("");
    const [category, setCategory] =  useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [location, setLocation] = useState<string>("");
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    

    const CATEGORIES = formType === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

    const handleSubmit = async () => {
        if(!amount){
            setError("Amount is required");
            return;
        }

        if(!category){
            setError("Category is required");
            return;
        }

        setSubmitting(true);
        setError("");

        try {
            await apiClient.post("/transactions", {
                amount: parseFloat(amount),
                type: formType,
                category,
                description,
                location
            });
            onSuccess();
        }catch(error: any){
            setError(error.response?.data?.message || "Failed to add transaction");
        }finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={[homeStyles.balanceCard, {marginTop: 0 }]}>
            <Text style={{ fontSize: 18, fontWeight: "600",  marginBottom: 16, color: colors.text }}>
                Add {formType === "INCOME" ? "Income" : "Expense"}
            </Text>
            {error ? (
                <View>
                    <Ionicons name="alert-circle" size={20} color={colors.expense} />
                    <Text style={authStyles.errorText}>{error}</Text>
                </View>
            ): null}

            <InputField
                label="Amount"
                placeholder="0.00"
                value={amount}
                onChangeText={(text) => {setAmount(text); setError(""); }}
                keyboardType="decimal-pad"
                isPassword={false}
                leftIcon="cash-outline"
            />

            <Text style={{fontSize: 14, fontWeight: "600", marginBottom: 8, marginTop: 8, color: colors.text }}>
                Category
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16}}>

                { CATEGORIES.map((cat) => (
                    <TouchableOpacity
                        key={cat}
                        onPress={() => {setCategory(cat); setError(""); }}
                        style={{
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            borderRadius: 20,
                            backgroundColor: category === cat ? colors.primary : colors.card,
                            borderWidth: 1,
                            borderColor: category === cat ? colors.primary : colors.border,
                        }}
                    >
                        <Text style={{ color: category === cat ? colors.white : colors.text }}>
                            {cat}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            
            <InputField
                label="Description (optional)"
                placeholder="What was this for?"
                value={description}
                onChangeText={setDescription}
                isPassword={false}
                leftIcon="document-text-outline"
            />

            <InputField
                label="Location"
                placeholder="Location eg United Kingdom"
                value={location}
                onChangeText={setLocation}
                isPassword={false}
                leftIcon="document-text-outline"
            />

            <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
                <TouchableOpacity
                    onPress={onClose}
                    style={{
                        flex: 1,
                        padding: 14,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        alignItems: "center",
                    }}
                >
                    <Text style={{ color: colors.text, fontWeight: "600" }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={submitting}
                    style={{
                        flex: 1,
                        padding: 14,
                        borderRadius: 12,
                        backgroundColor: formType === "INCOME" ? colors.income : colors.expense,
                        alignItems: "center",
                    }}
                >
                    {submitting ? (
                        <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                        <Text style={{ color: colors.white, fontWeight: "700" }}>Add</Text>
                    )}
                </TouchableOpacity>
            </View>

        </View>
    )
}


export default QuickAddForm;