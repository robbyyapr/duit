import { SecureStore } from './secureStore';
import { ACCOUNT_STORE, TRANSACTION_STORE, DEBT_STORE, BILL_STORE, ZAKAT_STORE, BUDGET_STORE } from '../constants';
import type { Account, Transaction, Debt, Bill, Zakat, Budget } from '../types';

const init = async () => {
  await SecureStore.getDb();
};

const clearAllData = async () => {
  await SecureStore.clearAll();
};

const accounts = {
  add: async (account: Account): Promise<Account> => {
    await SecureStore.put<Account>(ACCOUNT_STORE, account);
    return account;
  },
  update: async (id: string, patch: Partial<Account>): Promise<Account> => {
    const existing = await SecureStore.get<Account>(ACCOUNT_STORE, id);
    if (!existing) throw new Error('Account not found');
    const updated: Account = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    await SecureStore.put<Account>(ACCOUNT_STORE, updated);
    return updated;
  },
  delete: async (id: string): Promise<void> => {
    const txs = await SecureStore.list<Transaction>(TRANSACTION_STORE);
    await Promise.all(
      txs
        .filter(tx => tx.accountId === id)
        .map(tx => SecureStore.delete(TRANSACTION_STORE, tx.id))
    );
    await SecureStore.delete(ACCOUNT_STORE, id);
  },
  list: (): Promise<Account[]> => SecureStore.list<Account>(ACCOUNT_STORE),
  get: (id: string): Promise<Account | undefined> => SecureStore.get<Account>(ACCOUNT_STORE, id),
};

const transactions = {
  add: async (transaction: Transaction): Promise<Transaction> => {
    await SecureStore.put<Transaction>(TRANSACTION_STORE, transaction);
    return transaction;
  },
  update: async (id: string, patch: Partial<Transaction>): Promise<Transaction> => {
    const existing = await SecureStore.get<Transaction>(TRANSACTION_STORE, id);
    if (!existing) throw new Error('Transaction not found');
    const updated: Transaction = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    await SecureStore.put<Transaction>(TRANSACTION_STORE, updated);
    return updated;
  },
  delete: async (id: string): Promise<void> => SecureStore.delete(TRANSACTION_STORE, id),
  list: (): Promise<Transaction[]> => SecureStore.list<Transaction>(TRANSACTION_STORE),
  get: (id: string): Promise<Transaction | undefined> => SecureStore.get<Transaction>(TRANSACTION_STORE, id),
};

const debts = {
  add: async (debt: Debt): Promise<Debt> => {
    await SecureStore.put<Debt>(DEBT_STORE, debt);
    return debt;
  },
  update: async (id: string, patch: Partial<Debt>): Promise<Debt> => {
    const existing = await SecureStore.get<Debt>(DEBT_STORE, id);
    if (!existing) throw new Error('Debt not found');
    const updated: Debt = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    await SecureStore.put<Debt>(DEBT_STORE, updated);
    return updated;
  },
  delete: async (id: string): Promise<void> => SecureStore.delete(DEBT_STORE, id),
  list: (): Promise<Debt[]> => SecureStore.list<Debt>(DEBT_STORE),
  get: (id: string): Promise<Debt | undefined> => SecureStore.get<Debt>(DEBT_STORE, id),
};

const bills = {
  add: async (bill: Bill): Promise<Bill> => {
    await SecureStore.put<Bill>(BILL_STORE, bill);
    return bill;
  },
  update: async (id: string, patch: Partial<Bill>): Promise<Bill> => {
    const existing = await SecureStore.get<Bill>(BILL_STORE, id);
    if (!existing) throw new Error('Bill not found');
    const updated: Bill = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    await SecureStore.put<Bill>(BILL_STORE, updated);
    return updated;
  },
  delete: async (id: string): Promise<void> => SecureStore.delete(BILL_STORE, id),
  list: (): Promise<Bill[]> => SecureStore.list<Bill>(BILL_STORE),
  get: (id: string): Promise<Bill | undefined> => SecureStore.get<Bill>(BILL_STORE, id),
};

const zakat = {
  add: async (item: Zakat): Promise<Zakat> => {
    await SecureStore.put<Zakat>(ZAKAT_STORE, item);
    return item;
  },
  list: (): Promise<Zakat[]> => SecureStore.list<Zakat>(ZAKAT_STORE),
  markAsPaid: async (ids: string[]): Promise<void> => {
    for (const id of ids) {
      const existing = await SecureStore.get<Zakat>(ZAKAT_STORE, id);
      if (existing) {
        existing.isPaid = true;
        existing.paidAt = new Date().toISOString();
        await SecureStore.put<Zakat>(ZAKAT_STORE, existing);
      }
    }
  },
};

const budgets = {
  get: (id: string): Promise<Budget | undefined> => SecureStore.get<Budget>(BUDGET_STORE, id),
  upsert: async (budget: Budget): Promise<Budget> => {
    await SecureStore.put<Budget>(BUDGET_STORE, budget);
    return budget;
  },
  list: (): Promise<Budget[]> => SecureStore.list<Budget>(BUDGET_STORE),
};

const dbService = { init, clearAllData, accounts, transactions, debts, bills, zakat, budgets };
export default dbService;