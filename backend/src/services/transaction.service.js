import prisma from "../configurations/prisma.connect.js";

export const createTransactionRecord = async (transactionData) => {

    console.log(JSON.stringify(transactionData));

    const record = prisma.transaction.create({
        data: {...transactionData},
        select: {
            id: true,
            user: true,
            userId: true,
            transType: true,
            category: true,
            description: true,
            receiptUrl: true,
            location: true,
            createdAt: true,
            updatedAt: true,
        }
    })

    return record;

}

export const getTransactionsbyUser = async (userId) => {
    const transactions = await prisma.transaction.findMany({where: {userId: userId}});
    if(!transactions) return [];
    return transactions;
}

export const getTransactionById = async (transactionId) => {
    const transaction = await prisma.transaction.findUnique({where: {id: transactionId}});
    if(!transaction) return null;
    return transaction;
}

export const deleteTransactionById = async (transactionId, userId) => {
    
    return await prisma.transaction.delete({ where: {id: transactionId, userId: userId}});
}


export const updateTransactionRecord = async (transactionId, userId, transactionData) => {
    
    const updatedTransaction = prisma.transaction.update({
        where: {id: transactionId, userId: userId},
        data: transactionData,
        select: {
            id: true,
            amount: true,
            transType: true,
            category: true,
            description: true,
            receiptUrl: true,
            location: true,
            transactionDate: true,
            createdAt: true,
            updatedAt: true,
        }
    });
    if(!updatedTransaction) return null;
    return updatedTransaction;
}

