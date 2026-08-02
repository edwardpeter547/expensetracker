
import { ReactNode } from "react";

export type childrenNodes = {
    children: ReactNode
}

export interface DashboardData {
    balance: number;
    totalIncome: number;
    totalExpenses: number;
    recentTransactions: Array<{
        id: string;
        amount: number;
        transType: "INCOME" | "EXPENSE";
        category: string;
        description: string | null;
        transactionDate: string;
    }>;
}