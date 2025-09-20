const enc = new TextEncoder();
const dec = new TextDecoder();

export type SupportedKdf = 'pbkdf2';

export interface CryptoMetadata {
  salt: string;
  iterations: number;
  kdf: SupportedKdf;
  keyVersion: number;
}

export interface EncryptedPayload {
  iv: string;
  ct: string;
  tag: string;
  ver: number;
  schemaVersion: number;
}

const STORAGE_KEY = 'duit:crypto-meta';
const KEY_VERSION = 1;
const DEFAULT_ITERATIONS = 250_000;

let cachedKey: CryptoKey | null = null;
let cachedMeta: CryptoMetadata | null = null;

const toArrayBuffer = (value: string): ArrayBuffer => enc.encode(value);
const toBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const fromBase64 = (value: string): ArrayBuffer => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

const loadMetadata = (): CryptoMetadata | null => {
  if (cachedMeta) return cachedMeta;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const meta = JSON.parse(raw) as CryptoMetadata;
    cachedMeta = meta;
    return meta;
  } catch (error) {
    console.warn('[crypto] Failed to parse metadata', error);
    return null;
  }
};

const persistMetadata = (meta: CryptoMetadata) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
  cachedMeta = meta;
};

const deriveKey = async (passphrase: string, meta: CryptoMetadata): Promise<CryptoKey> => {
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    toArrayBuffer(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const derived = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: fromBase64(meta.salt),
      iterations: meta.iterations,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return derived;
};

const generateMetadata = (): CryptoMetadata => {
  const saltBytes = new Uint8Array(16);
  window.crypto.getRandomValues(saltBytes);
  return {
    salt: toBase64(saltBytes.buffer),
    iterations: DEFAULT_ITERATIONS,
    kdf: 'pbkdf2',
    keyVersion: KEY_VERSION,
  };
};

const splitCipher = (buffer: ArrayBuffer): { body: ArrayBuffer; tag: ArrayBuffer } => {
  const bytes = new Uint8Array(buffer);
  const tagLength = 16; // AES-GCM default tag size is 128 bits
  const body = bytes.slice(0, bytes.length - tagLength);
  const tag = bytes.slice(bytes.length - tagLength);
  return { body: body.buffer, tag: tag.buffer };
};

const combineCipher = (body: ArrayBuffer, tag: ArrayBuffer): ArrayBuffer => {
  const bodyBytes = new Uint8Array(body);
  const tagBytes = new Uint8Array(tag);
  const combined = new Uint8Array(bodyBytes.length + tagBytes.length);
  combined.set(bodyBytes, 0);
  combined.set(tagBytes, bodyBytes.length);
  return combined.buffer;
};

const ensureKey = async (passphrase?: string): Promise<CryptoKey> => {
  if (cachedKey) return cachedKey;
  const meta = loadMetadata();
  if (!meta) {
    if (!passphrase) {
      throw new Error('Master passphrase required to initialize crypto.');
    }
    const freshMeta = generateMetadata();
    const key = await deriveKey(passphrase, freshMeta);
    cachedKey = key;
    persistMetadata(freshMeta);
    return key;
  }
  if (!passphrase) {
    throw new Error('Master passphrase required to derive key.');
  }
  cachedKey = await deriveKey(passphrase, meta);
  return cachedKey;
};

const setup = async (passphrase: string): Promise<CryptoMetadata> => {
  const meta = loadMetadata() ?? generateMetadata();
  cachedKey = await deriveKey(passphrase, meta);
  persistMetadata(meta);
  return meta;
};

const encrypt = async <T>(data: T, schemaVersion: number): Promise<EncryptedPayload> => {
  if (!cachedKey) {
    throw new Error('Crypto key missing, call Crypto.setup first.');
  }
  const iv = new Uint8Array(12);
  window.crypto.getRandomValues(iv);
  const plaintext = toArrayBuffer(JSON.stringify(data));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cachedKey,
    plaintext
  );
  const { body, tag } = splitCipher(encrypted);
  return {
    iv: toBase64(iv.buffer),
    ct: toBase64(body),
    tag: toBase64(tag),
    ver: KEY_VERSION,
    schemaVersion,
  };
};

const decrypt = async <T>(payload: EncryptedPayload): Promise<T> => {
  if (!cachedKey) {
    throw new Error('Crypto key missing, call Crypto.setup first.');
  }
  const iv = fromBase64(payload.iv);
  const body = fromBase64(payload.ct);
  const tag = fromBase64(payload.tag);
  const cipher = combineCipher(body, tag);
  try {
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      cachedKey,
      cipher
    );
    return JSON.parse(dec.decode(new Uint8Array(decrypted))) as T;
  } catch (error) {
    throw new Error('Failed to decrypt payload.');
  }
};

const clearKey = () => {
  cachedKey = null;
};

const rotateKey = async (newPassphrase: string, reencryptFn: (encryptFn: typeof encrypt) => Promise<void>) => {
  const newMeta = generateMetadata();
  const newKey = await deriveKey(newPassphrase, newMeta);
  const previousKey = cachedKey;
  const previousMeta = cachedMeta;

  cachedKey = newKey;
  persistMetadata(newMeta);

  try {
    await reencryptFn(encrypt);
  } catch (error) {
    if (previousKey && previousMeta) {
      cachedKey = previousKey;
      persistMetadata(previousMeta);
    }
    throw error;
  }
};

const applyMetadata = (meta: CryptoMetadata) => {
  persistMetadata(meta);
  clearKey();
};

export const Crypto = {
  setup,
  encrypt,
  decrypt,
  rotateKey,
  clearKey,
  loadMetadata,
  ensureKey,
  applyMetadata,
};
export type { CryptoMetadata };