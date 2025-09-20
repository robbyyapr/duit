
import { openDB, type IDBPDatabase } from 'idb';
import { DB_NAME, DB_VERSION, ACCOUNT_STORE, TRANSACTION_STORE } from '../constants';
import type { Account, Transaction } from '../types';

let db: IDBPDatabase;

const init = async () => {
  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(ACCOUNT_STORE)) {
        db.createObjectStore(ACCOUNT_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(TRANSACTION_STORE)) {
        const store = db.createObjectStore(TRANSACTION_STORE, { keyPath: 'id' });
        store.createIndex('accountId', 'accountId');
        store.createIndex('date', 'date');
      }
    },
  });
};

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
    // Also delete associated transactions
    const tx = db.transaction([ACCOUNT_STORE, TRANSACTION_STORE], 'readwrite');
    await tx.objectStore(ACCOUNT_STORE).delete(id);
    let cursor = await tx.objectStore(TRANSACTION_STORE).index('accountId').openCursor(id);
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await tx.done;
  },
  list: (): Promise<Account[]> => {
    return db.getAll(ACCOUNT_STORE);
  },
  get: (id: string): Promise<Account | undefined> => {
    return db.get(ACCOUNT_STORE, id);
  }
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
  delete: async (id: string): Promise<void> => {
    await db.delete(TRANSACTION_STORE, id);
  },
  list: (): Promise<Transaction[]> => {
    return db.getAll(TRANSACTION_STORE);
  },
  get: (id: string): Promise<Transaction | undefined> => {
    return db.get(TRANSACTION_STORE, id);
  }
};

const dbService = { init, accounts, transactions };
export default dbService;
