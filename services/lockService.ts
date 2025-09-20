import { LOCKSCREEN_PIN, LOCKSCREEN_PASSWORD } from '../constants';
import { Crypto, type CryptoMetadata, type EncryptedPayload } from './cryptoService';
import { SecureStore } from './secureStore';

export interface LockState {
  locked: boolean;
  attempts: number;
  cooldownUntil: number | null;
  lastFailures: string[];
  masterReady: boolean;
}

interface InternalState extends LockState {}

export interface UnlockPayload {
  pin?: string;
  password?: string;
  passphrase?: string;
  webauthn?: boolean;
}

const LOCK_STATE_KEY = 'duit:lock-state';
const SENTINEL_KEY = 'duit:sentinel';
const FAILURE_LOG_LIMIT = 10;
const MAX_FAIL_BEFORE_COOLDOWN = 5;
const BASE_COOLDOWN_MS = 30_000;

let state: InternalState = {
  locked: true,
  attempts: 0,
  cooldownUntil: null,
  lastFailures: [],
  masterReady: false,
};

const readState = (): InternalState => {
  if (state) return state;
  const raw = localStorage.getItem(LOCK_STATE_KEY);
  if (!raw) return state;
  try {
    const parsed = JSON.parse(raw) as LockState;
    state = { ...state, ...parsed };
  } catch (error) {
    console.warn('[lock] Failed to parse lock state', error);
  }
  return state;
};

const persistState = () => {
  const { masterReady: _masterReady, ...persisted } = state;
  localStorage.setItem(LOCK_STATE_KEY, JSON.stringify(persisted));
};

const cooldownRemaining = () => {
  if (!state.cooldownUntil) return 0;
  const diff = state.cooldownUntil - Date.now();
  return diff > 0 ? diff : 0;
};

const registerFailure = () => {
  state.attempts += 1;
  state.lastFailures = [new Date().toISOString(), ...state.lastFailures].slice(0, FAILURE_LOG_LIMIT);
  if (state.attempts >= MAX_FAIL_BEFORE_COOLDOWN) {
    const exponent = state.attempts - MAX_FAIL_BEFORE_COOLDOWN + 1;
    state.cooldownUntil = Date.now() + BASE_COOLDOWN_MS * Math.pow(2, exponent - 1);
  }
  persistState();
};

const registerSuccess = () => {
  state.attempts = 0;
  state.cooldownUntil = null;
  persistState();
};

const ensureNoCooldown = () => {
  const remaining = cooldownRemaining();
  if (remaining > 0) {
    const seconds = Math.ceil(remaining / 1000);
    throw new Error(`Terlalu banyak percobaan. Coba lagi dalam ${seconds} detik.`);
  }
};

const getSentinel = (): EncryptedPayload | null => {
  const raw = localStorage.getItem(SENTINEL_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EncryptedPayload;
  } catch (error) {
    console.warn('[lock] Failed to parse sentinel');
    return null;
  }
};

const storeSentinel = async () => {
  const payload = await Crypto.encrypt({ ok: true, at: new Date().toISOString() }, 0);
  localStorage.setItem(SENTINEL_KEY, JSON.stringify(payload));
};

const verifySentinel = async () => {
  const sentinel = getSentinel();
  if (!sentinel) {
    await storeSentinel();
    return;
  }
  await Crypto.decrypt<{ ok: boolean }>(sentinel);
};

const prepareMaster = async (passphrase: string): Promise<CryptoMetadata> => {
  const meta = await Crypto.setup(passphrase);
  await verifySentinel();
  state.masterReady = true;
  persistState();
  return meta;
};

const unlock = async (payload: UnlockPayload) => {
  readState();
  ensureNoCooldown();

  if (payload.passphrase) {
    try {
      await prepareMaster(payload.passphrase);
      state.locked = false;
      registerSuccess();
      return { type: 'passphrase' as const };
    } catch (error) {
      registerFailure();
      Crypto.clearKey();
      throw error;
    }
  }

  if (payload.pin || payload.password) {
    if (!state.masterReady) {
      throw new Error('Sesi belum dibuka dengan passphrase.');
    }
    const pinAccepted = payload.pin && payload.pin === LOCKSCREEN_PIN;
    const passwordAccepted = payload.password && payload.password === LOCKSCREEN_PASSWORD;
    if (pinAccepted || passwordAccepted) {
      state.locked = false;
      registerSuccess();
      return { type: pinAccepted ? ('pin' as const) : ('password' as const) };
    }
    registerFailure();
    throw new Error('PIN/Password salah.');
  }

  if (payload.webauthn) {
    throw new Error('WebAuthn belum dikonfigurasi.');
  }

  throw new Error('Metode unlock tidak dikenali.');
};

const lock = (options?: { clearKey?: boolean }) => {
  readState();
  state.locked = true;
  persistState();
  if (options?.clearKey) {
    state.masterReady = false;
    Crypto.clearKey();
  }
};

const stateFn = (): LockState => {
  readState();
  return {
    locked: state.locked,
    attempts: state.attempts,
    cooldownUntil: state.cooldownUntil,
    lastFailures: state.lastFailures,
    masterReady: state.masterReady,
  };
};

const randomizeKeypad = (): string[] => {
  const digits = Array.from({ length: 10 }, (_, i) => i.toString());
  for (let i = digits.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  return digits;
};

const initialize = () => {
  readState();
  state.locked = true;
  state.masterReady = false;
};

const reset = () => {
  state = {
    locked: true,
    attempts: 0,
    cooldownUntil: null,
    lastFailures: [],
    masterReady: false,
  };
  persistState();
};

const rotateKey = async (newPassphrase: string) => {
  await Crypto.rotateKey(newPassphrase, SecureStore.reencryptAll);
};

export const Lock = {
  initialize,
  state: stateFn,
  unlock,
  lock,
  randomizeKeypad,
  reset,
  rotateKey,
  storeSentinel,
};