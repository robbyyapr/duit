import { openDB, type IDBPDatabase } from 'idb';
import { DB_NAME, DB_VERSION, ACCOUNT_STORE, TRANSACTION_STORE, DEBT_STORE, BILL_STORE, ZAKAT_STORE, BUDGET_STORE } from '../constants';
import type { Account, Transaction, Debt, Bill, Zakat, Budget } from '../types';

let db: IDBPDatabase;

const init = async () => {
  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains(ACCOUNT_STORE)) {
          db.createObjectStore(ACCOUNT_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(TRANSACTION_STORE)) {
          const store = db.createObjectStore(TRANSACTION_STORE, { keyPath: 'id' });
          store.createIndex('accountId', 'accountId');
          store.createIndex('date', 'date');
        }
      }
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(DEBT_STORE)) {
            db.createObjectStore(DEBT_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(BILL_STORE)) {
            db.createObjectStore(BILL_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(ZAKAT_STORE)) {
            const store = db.createObjectStore(ZAKAT_STORE, { keyPath: 'id' });
            store.createIndex('isPaid', 'isPaid');
        }
      }
      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains(BUDGET_STORE)) {
          db.createObjectStore(BUDGET_STORE, { keyPath: 'id' });
        }
      }
    },
  });
};

const clearAllData = async () => {
    const tx = db.transaction([ACCOUNT_STORE, TRANSACTION_STORE, DEBT_STORE, BILL_STORE, ZAKAT_STORE, BUDGET_STORE], 'readwrite');
    await Promise.all([
        tx.objectStore(ACCOUNT_STORE).clear(),
        tx.objectStore(TRANSACTION_STORE).clear(),
        tx.objectStore(DEBT_STORE).clear(),
        tx.objectStore(BILL_STORE).clear(),
        tx.objectStore(ZAKAT_STORE).clear(),
        tx.objectStore(BUDGET_STORE).clear(),
    ]);
    await tx.done;
}

const accounts = {
  add: async (account: Account): Promise<Account> => {
    await db.put(ACCOUNT_STORE, account);
    return account;
  },
  update: async (id: string, patch: Partial<Account>): Promise<Account> => {
    const account = await db.get(ACCOUNT_STORE, id);
    if (!account) throw new Error('Account not found');
    const updatedAccount = { ...account, ...patch, updatedAt: new Date().toISOString() };
    await db.put(ACCOUNT_STORE, updatedAccount);
    return updatedAccount;
  },
  delete: async (id: string): Promise<void> => {
    const tx = db.transaction([ACCOUNT_STORE, TRANSACTION_STORE], 'readwrite');
    await tx.objectStore(ACCOUNT_STORE).delete(id);
    let cursor = await tx.objectStore(TRANSACTION_STORE).index('accountId').openCursor(id);
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await tx.done;
  },
  list: (): Promise<Account[]> => db.getAll(ACCOUNT_STORE),
  get: (id: string): Promise<Account | undefined> => db.get(ACCOUNT_STORE, id),
};

const transactions = {
  add: async (transaction: Transaction): Promise<Transaction> => {
    await db.put(TRANSACTION_STORE, transaction);
    return transaction;
  },
  update: async (id: string, patch: Partial<Transaction>): Promise<Transaction> => {
    const transaction = await db.get(TRANSACTION_STORE, id);
    if (!transaction) throw new Error('Transaction not found');
    const updatedTransaction = { ...transaction, ...patch, updatedAt: new Date().toISOString() };
    await db.put(TRANSACTION_STORE, updatedTransaction);
    return updatedTransaction;
  },
  delete: async (id: string): Promise<void> => db.delete(TRANSACTION_STORE, id),
  list: (): Promise<Transaction[]> => db.getAll(TRANSACTION_STORE),
  get: (id: string): Promise<Transaction | undefined> => db.get(TRANSACTION_STORE, id),
};

const debts = {
  add: async (debt: Debt): Promise<Debt> => {
    await db.put(DEBT_STORE, debt);
    return debt;
  },
  update: async (id: string, patch: Partial<Debt>): Promise<Debt> => {
    const debt = await db.get(DEBT_STORE, id);
    if (!debt) throw new Error('Debt not found');
    const updatedDebt = { ...debt, ...patch, updatedAt: new Date().toISOString() };
    await db.put(DEBT_STORE, updatedDebt);
    return updatedDebt;
  },
  delete: async (id: string): Promise<void> => db.delete(DEBT_STORE, id),
  list: (): Promise<Debt[]> => db.getAll(DEBT_STORE),
  get: (id: string): Promise<Debt | undefined> => db.get(DEBT_STORE, id),
};

const bills = {
  add: async (bill: Bill): Promise<Bill> => {
    await db.put(BILL_STORE, bill);
    return bill;
  },
  update: async (id: string, patch: Partial<Bill>): Promise<Bill> => {
    const bill = await db.get(BILL_STORE, id);
    if (!bill) throw new Error('Bill not found');
    const updatedBill = { ...bill, ...patch, updatedAt: new Date().toISOString() };
    await db.put(BILL_STORE, updatedBill);
    return updatedBill;
  },
  delete: async (id: string): Promise<void> => db.delete(BILL_STORE, id),
  list: (): Promise<Bill[]> => db.getAll(BILL_STORE),
  get: (id: string): Promise<Bill | undefined> => db.get(BILL_STORE, id),
};

const zakat = {
  add: async (item: Zakat): Promise<Zakat> => {
    await db.put(ZAKAT_STORE, item);
    return item;
  },
  list: (): Promise<Zakat[]> => db.getAll(ZAKAT_STORE),
  markAsPaid: async (ids: string[]): Promise<void> => {
    const tx = db.transaction(ZAKAT_STORE, 'readwrite');
    const store = tx.objectStore(ZAKAT_STORE);
    const paidAt = new Date().toISOString();
    await Promise.all(ids.map(async (id) => {
      const item = await store.get(id);
      if (item) {
        item.isPaid = true;
        item.paidAt = paidAt;
        await store.put(item);
      }
    }));
    await tx.done;
  },
};

const budgets = {
    get: (id: string): Promise<Budget | undefined> => db.get(BUDGET_STORE, id),
    upsert: async (budget: Budget): Promise<Budget> => {
        await db.put(BUDGET_STORE, budget);
        return budget;
    },
    list: (): Promise<Budget[]> => db.getAll(BUDGET_STORE),
};


const dbService = { init, clearAllData, accounts, transactions, debts, bills, zakat, budgets };
export default dbService;
