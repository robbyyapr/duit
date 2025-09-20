import {
  ACCOUNT_STORE,
  TRANSACTION_STORE,
  DEBT_STORE,
  BILL_STORE,
  ZAKAT_STORE,
  BUDGET_STORE,
  DATA_SCHEMA_VERSION,
  BACKUP_HEADER,
} from '../constants';
import { Crypto, type CryptoMetadata, type EncryptedPayload } from './cryptoService';
import { SecureStore } from './secureStore';

interface BackupFile {
  header: string;
  meta: CryptoMetadata;
  payload: EncryptedPayload;
}

interface BackupContent {
  createdAt: string;
  schemaVersion: number;
  stores: Record<string, unknown[]>;
}

const STORE_ORDER = [
  ACCOUNT_STORE,
  TRANSACTION_STORE,
  DEBT_STORE,
  BILL_STORE,
  ZAKAT_STORE,
  BUDGET_STORE,
];

const exportEncrypted = async (): Promise<Blob> => {
  const meta = Crypto.loadMetadata();
  if (!meta) {
    throw new Error('Belum ada master passphrase yang dikonfigurasi.');
  }

  const content: BackupContent = {
    createdAt: new Date().toISOString(),
    schemaVersion: DATA_SCHEMA_VERSION,
    stores: {},
  };

  for (const store of STORE_ORDER) {
    const items = await SecureStore.list<any>(store as any);
    content.stores[store] = items;
  }

  const payload = await Crypto.encrypt(content, DATA_SCHEMA_VERSION);
  const file: BackupFile = {
    header: BACKUP_HEADER,
    meta,
    payload,
  };

  const blob = new Blob([JSON.stringify(file)], { type: 'application/json' });
  return blob;
};

const importEncrypted = async (text: string, passphrase: string) => {
  let parsed: BackupFile;
  try {
    parsed = JSON.parse(text) as BackupFile;
  } catch (error) {
    throw new Error('File backup tidak valid.');
  }

  if (parsed.header !== BACKUP_HEADER) {
    throw new Error('Format backup tidak dikenali.');
  }

  Crypto.applyMetadata(parsed.meta);
  await Crypto.setup(passphrase);

  const content = await Crypto.decrypt<BackupContent>(parsed.payload);

  if (content.schemaVersion !== DATA_SCHEMA_VERSION) {
    console.warn('Skema backup berbeda, mencoba lanjut.');
  }

  await SecureStore.clearAll();

  for (const store of STORE_ORDER) {
    const list = content.stores[store] || [];
    for (const item of list as any[]) {
      await SecureStore.put(store as any, item);
    }
  }
};

export const Backup = {
  exportEncrypted,
  importEncrypted,
};