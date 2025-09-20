
export type AccountType = 'bank' | 'cash' | 'ewallet' | 'card' | 'other';
export type TransactionType = 'income' | 'expense';
export type Theme = 'light' | 'dark';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: 'IDR';
  openingBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  accountId: string;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  location?: { lat: number; lng: number; label?: string };
  note?: string;
  source: 'manual' | 'ocr';
  createdAt: string;
  updatedAt: string;
}

export interface ModalState {
  type: 'transaction' | 'accounts' | 'settings' | null;
  data?: Transaction | Account | any;
}

export interface AppContextType {
  theme: Theme;
  toggleTheme: () => void;
  accounts: Account[];
  transactions: Transaction[];
  categories: string[];
  isLoading: boolean;
  refreshData: () => Promise<void>;
  openModal: (type: ModalState['type'], data?: ModalState['data']) => void;
  closeModal: () => void;
}
