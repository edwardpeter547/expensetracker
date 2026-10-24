
import { ReactNode } from "react";

export type childrenNodes = {
    children: ReactNode
}

export interface DashboardData {
    currency: string;
    balance: string;
    totalIncome: string;
    totalExpenses: string;
    recentTransactions: Array<{
        id: string;
        amount: string;
        currency: string;
        transType: "INCOME" | "EXPENSE";
        category: string;
        categoryId?: string | null;
        description: string | null;
        transactionDate: string;
    }>;
}
