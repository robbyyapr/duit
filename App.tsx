
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useIdle, useToggle } from 'react-use';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { TransactionModal } from './components/TransactionModal';
import { AccountsModal } from './components/AccountsModal';
import { SettingsModal } from './components/SettingsModal';
import { Lockscreen } from './components/Lockscreen';
import { AppContext } from './contexts/AppContext';
import dbService from './services/dbService';
import type { Account, Transaction, ModalState, Theme } from './types';
import { THEME_KEY, IDLE_TIMEOUT, DEFAULT_CATEGORIES } from './constants';

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem(THEME_KEY) as Theme;
    return savedTheme || 'light';
  });
  
  const [isLocked, setLocked] = useState(false);
  const isIdle = useIdle(IDLE_TIMEOUT);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>({ type: null, data: null });
  const [categories] = useState<string[]>(DEFAULT_CATEGORIES);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    if (isIdle) {
      setLocked(true);
    }
  }, [isIdle]);

  const refreshData = useCallback(async () => {
    try {
      const [accs, txs] = await Promise.all([
        dbService.accounts.list(),
        dbService.transactions.list()
      ]);
      setAccounts(accs);
      setTransactions(txs);
    } catch (error) {
      console.error("Failed to refresh data:", error);
    }
  }, []);

  useEffect(() => {
    const initDB = async () => {
      try {
        await dbService.init();
        await refreshData();
      } catch (error) {
        console.error("Database initialization failed:", error);
      } finally {
        setIsLoading(false);
      }
    };
    initDB();
  }, [refreshData]);

  const totalBalance = useMemo(() => {
    return accounts.reduce((total, acc) => {
        const balance = acc.openingBalance + transactions
            .filter(t => t.accountId === acc.id)
            .reduce((accTotal, t) => {
                if (t.type === 'income') return accTotal + t.amount;
                return accTotal - t.amount;
            }, 0);
        return total + balance;
    }, 0);
  }, [accounts, transactions]);

  const openModal = useCallback((type: ModalState['type'], data: ModalState['data'] = null) => {
    setModal({ type, data });
  }, []);

  const closeModal = useCallback(() => {
    setModal({ type: null, data: null });
  }, []);

  if (isLocked) {
    return <Lockscreen onUnlock={() => setLocked(false)} />;
  }
  
  return (
    <AppContext.Provider value={{
      theme,
      toggleTheme,
      accounts,
      transactions,
      categories,
      isLoading,
      refreshData,
      openModal,
      closeModal,
    }}>
      <div className="bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text min-h-screen font-sans transition-colors duration-300">
        <Header totalBalance={totalBalance} />
        <main className="p-4 md:p-6">
          <Dashboard />
        </main>
        {modal.type === 'transaction' && <TransactionModal isOpen={true} onClose={closeModal} transactionData={modal.data as Transaction | null} />}
        {modal.type === 'accounts' && <AccountsModal isOpen={true} onClose={closeModal} />}
        {modal.type === 'settings' && <SettingsModal isOpen={true} onClose={closeModal} />}
      </div>
    </AppContext.Provider>
  );
};

export default App;
