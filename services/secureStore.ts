import { openDB, type IDBPDatabase } from 'idb';
import { Crypto, type EncryptedPayload } from './cryptoService';
import {
  ACCOUNT_STORE,
  TRANSACTION_STORE,
  DEBT_STORE,
  BILL_STORE,
  ZAKAT_STORE,
  BUDGET_STORE,
  SECURE_DB_NAME,
  SECURE_DB_VERSION,
  DATA_SCHEMA_VERSION,
} from '../constants';

const STORES = [
  ACCOUNT_STORE,
  TRANSACTION_STORE,
  DEBT_STORE,
  BILL_STORE,
  ZAKAT_STORE,
  BUDGET_STORE,
];

interface RawRecord {
  id: string;
  payload: EncryptedPayload;
}

type StoreName = (typeof STORES)[number];

let db: IDBPDatabase | null = null;

const getDb = async () => {
  if (db) return db;
  db = await openDB(SECURE_DB_NAME, SECURE_DB_VERSION, {
    upgrade(database) {
      STORES.forEach(store => {
        if (!database.objectStoreNames.contains(store)) {
          database.createObjectStore(store, { keyPath: 'id' });
        }
      });
    },
  });
  return db;
};

const put = async <T extends { id: string }>(store: StoreName, value: T) => {
  const database = await getDb();
  const payload = await Crypto.encrypt(value, DATA_SCHEMA_VERSION);
  await database.put(store, { id: value.id, payload });
};

const get = async <T>(store: StoreName, id: string): Promise<T | undefined> => {
  const database = await getDb();
  const raw = await database.get(store, id) as RawRecord | undefined;
  if (!raw) return undefined;
  return Crypto.decrypt<T>(raw.payload);
};

const deleteRecord = async (store: StoreName, id: string) => {
  const database = await getDb();
  await database.delete(store, id);
};

const list = async <T>(store: StoreName): Promise<T[]> => {
  const database = await getDb();
  const tx = database.transaction(store, 'readonly');
  const values: T[] = [];
  let cursor = await tx.store.openCursor();
  while (cursor) {
    const raw = cursor.value as RawRecord;
    const decoded = await Crypto.decrypt<T>(raw.payload);
    values.push(decoded);
    cursor = await cursor.continue();
  }
  await tx.done;
  return values;
};

const clearStore = async (store: StoreName) => {
  const database = await getDb();
  await database.clear(store);
};

const clearAll = async () => {
  await Promise.all(STORES.map(store => clearStore(store)));
};

const reencryptAll = async () => {
  const database = await getDb();
  for (const store of STORES) {
    const tx = database.transaction(store, 'readwrite');
    let cursor = await tx.store.openCursor();
    while (cursor) {
      const raw = cursor.value as RawRecord;
      const data = await Crypto.decrypt<any>(raw.payload);
      const updatedPayload = await Crypto.encrypt(data, DATA_SCHEMA_VERSION);
      await cursor.update({ id: raw.id, payload: updatedPayload });
      cursor = await cursor.continue();
    }
    await tx.done;
  }
};

export const SecureStore = {
  put,
  get,
  list,
  delete: deleteRecord,
  clearAll,
  reencryptAll,
  getDb,
};