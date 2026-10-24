import { apiClient } from "@/api/client";
import { normalizeApiError } from "@/api/errors";
import { useLocale } from "@/contexts/LocaleContext";
import useStyles from "@/hooks/useStyles";
import useTheme from "@/hooks/useTheme";
import { parseMoneyInput } from "@/localization/format";
import { SYSTEM_CATEGORIES, systemCategoryLabel } from "@/localization/systemCategories";
import { Ionicons } from '@expo/vector-icons';
import { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import InputField from "../ui/Input";


interface QuickAddFormProps {
    formType: "INCOME" | "EXPENSE";
    onClose: () => void;
    onSuccess: () => void;
}


const QuickAddForm = ({formType, onClose, onSuccess} : QuickAddFormProps) => {

    const { colors } = useTheme();
    const homeStyles = useStyles("home");
    const authStyles = useStyles("auth");
    const { language } = useLocale();

    const [amount, setAmount] = useState<string>("");
    const [category, setCategory] =  useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [location, setLocation] = useState<string>("");
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    

    const categories = SYSTEM_CATEGORIES.filter((item) => item.type === formType);

    const handleSubmit = async () => {
        if(!amount){
            setError("Amount is required");
            return;
        }

        const normalizedAmount = parseMoneyInput(amount, language);
        if(!normalizedAmount){
            setError("Enter a valid amount");
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
                amount: normalizedAmount,
                type: formType,
                category: systemCategoryLabel(category, language),
                categoryId: category,
                description,
                location
            });
            onSuccess();
        }catch(error){
            setError(normalizeApiError(error).message);
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

                { categories.map((cat) => (
                    <TouchableOpacity
                        key={cat.id}
                        onPress={() => {setCategory(cat.id); setError(""); }}
                        style={{
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            borderRadius: 20,
                            backgroundColor: category === cat.id ? colors.primary : colors.card,
                            borderWidth: 1,
                            borderColor: category === cat.id ? colors.primary : colors.border,
                        }}
                    >
                        <Text style={{ color: category === cat.id ? colors.white : colors.text }}>
                            {systemCategoryLabel(cat.id, language)}
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
