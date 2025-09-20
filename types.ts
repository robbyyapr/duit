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
  attachment?: string; // base64 data URL
  source: 'manual' | 'ocr';
  createdAt: string;
  updatedAt: string;
  // Internal properties for linking payments, not stored in DB
  _debtId?: string;
  _billId?: string;
}

export interface Debt {
  id: string;
  type: 'payable' | 'receivable'; // payable (hutang), receivable (piutang)
  person: string;
  initialAmount: number;
  outstandingAmount: number;
  description?: string;
  dueDate?: string; // YYYY-MM-DD
  isPaid: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDateDay: number; // 1-31
  category: string;
  accountId?: string;
  isActive: boolean;
  lastPaidMonth?: string; // YYYY-MM
  createdAt: string;
  updatedAt: string;
}

export interface Zakat {
  id: string;
  transactionId: string; // The ID of the income transaction
  amount: number;
  isPaid: boolean;
  paidAt?: string;
  createdAt: string;
}

export interface Budget {
  id: string; // YYYY-MM
  categoryBudgets: { [category: string]: number };
  createdAt: string;
  updatedAt: string;
}

export interface ModalState {
  type: 'transaction' | 'accounts' | 'settings' | 'debt' | 'bills' | 'zakat' | 'budget' | null;
  data?: Transaction | Account | Debt | Bill | any;
}

export interface AppContextType {
  theme: Theme;
  toggleTheme: () => void;
  accounts: Account[];
  transactions: Transaction[];
  debts: Debt[];
  bills: Bill[];
  zakat: Zakat[];
  budgets: Budget[];
  categories: string[];
  isLoading: boolean;
  refreshData: () => Promise<void>;
  openModal: (type: ModalState['type'], data?: ModalState['data']) => void;
  closeModal: () => void;
}
