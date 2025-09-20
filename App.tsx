import React, { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { useIdle } from 'react-use';
import { Header } from './components/Header';
import { AppContext } from './contexts/AppContext';
import dbService from './services/dbService';
import type { Account, Transaction, ModalState, Theme, Debt, Bill, Zakat, Budget } from './types';
import { DEFAULT_CATEGORIES, IDLE_TIMEOUT, THEME_KEY, BACKGROUND_LOCK_DELAY } from './constants';
import { Lock } from './services/lockService';
import { Privacy } from './services/privacyService';
import { MasterPassphraseSetup } from './components/MasterPassphraseSetup';
import { MasterPassphraseUnlock } from './components/MasterPassphraseUnlock';
import { Lockscreen } from './components/Lockscreen';
import { Crypto } from './services/cryptoService';

const Dashboard = lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));
const TransactionModal = lazy(() => import('./components/TransactionModal').then(module => ({ default: module.TransactionModal })));
const AccountsModal = lazy(() => import('./components/AccountsModal').then(module => ({ default: module.AccountsModal })));
const SettingsModal = lazy(() => import('./components/SettingsModal').then(module => ({ default: module.SettingsModal })));
const DebtModal = lazy(() => import('./components/DebtModal').then(module => ({ default: module.DebtModal })));
const BillsModal = lazy(() => import('./components/BillsModal').then(module => ({ default: module.BillsModal })));
const ZakatModal = lazy(() => import('./components/ZakatModal').then(module => ({ default: module.ZakatModal })));
const BudgetModal = lazy(() => import('./components/BudgetModal').then(module => ({ default: module.BudgetModal })));

type SecurityPhase = 'loading' | 'setup' | 'master-unlock' | 'quick-lock' | 'ready';

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem(THEME_KEY) as Theme;
    return savedTheme || 'light';
  });
  const [maskSensitive, setMaskSensitive] = useState(false);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [zakat, setZakat] = useState<Zakat[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>({ type: null, data: null });
  const [securityPhase, setSecurityPhase] = useState<SecurityPhase>('loading');
  const [lockState, setLockState] = useState(() => Lock.state());
  const [updateReady, setUpdateReady] = useState(false);

  const backgroundTimerRef = useRef<number | null>(null);

  const isIdle = useIdle(IDLE_TIMEOUT);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    Lock.initialize();
    const meta = Crypto.loadMetadata();
    setLockState(Lock.state());
    setSecurityPhase(meta ? 'master-unlock' : 'setup');
  }, []);

  useEffect(() => {
    Privacy.toggleMask(maskSensitive);
  }, [maskSensitive]);

  useEffect(() => {
    if (!isIdle || securityPhase !== 'ready') return;
    Lock.lock();
    setLockState(Lock.state());
    setSecurityPhase('quick-lock');
  }, [isIdle, securityPhase]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        Privacy.applyBlur(true);
        if (backgroundTimerRef.current) {
          window.clearTimeout(backgroundTimerRef.current);
        }
        backgroundTimerRef.current = window.setTimeout(() => {
          if (securityPhase === 'ready') {
            Lock.lock();
            setLockState(Lock.state());
            setSecurityPhase('quick-lock');
          }
        }, BACKGROUND_LOCK_DELAY);
      } else {
        Privacy.applyBlur(false);
        if (backgroundTimerRef.current) {
          window.clearTimeout(backgroundTimerRef.current);
          backgroundTimerRef.current = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (backgroundTimerRef.current) {
        window.clearTimeout(backgroundTimerRef.current);
        backgroundTimerRef.current = null;
      }
    };
  }, [securityPhase]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data && event.data.type === 'DUIT_SW_READY') {
        setUpdateReady(true);
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, []);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    const [accs, txs, dbs, bls, zks, bgs] = await Promise.all([
      dbService.accounts.list(),
      dbService.transactions.list(),
      dbService.debts.list(),
      dbService.bills.list(),
      dbService.zakat.list(),
      dbService.budgets.list(),
    ]);
    setAccounts(accs);
    setTransactions(txs);
    setDebts(dbs);
    setBills(bls);
    setZakat(zks);
    setBudgets(bgs);
    setIsLoading(false);
  }, []);

  const bootstrapData = useCallback(async () => {
    await dbService.init();
    await refreshData();
  }, [refreshData]);

  const handleMasterSetup = useCallback(async (passphrase: string) => {
    await Lock.unlock({ passphrase });
    setLockState(Lock.state());
    await bootstrapData();
    setSecurityPhase('ready');
  }, [bootstrapData]);

  const handleMasterUnlock = useCallback(async (passphrase: string) => {
    await Lock.unlock({ passphrase });
    setLockState(Lock.state());
    await bootstrapData();
    setSecurityPhase('ready');
  }, [bootstrapData]);

  const handleQuickUnlock = useCallback(async (payload: { pin?: string; password?: string }) => {
    await Lock.unlock(payload);
    setLockState(Lock.state());
    setSecurityPhase('ready');
  }, []);

  const lockApp = useCallback((options?: { clearKey?: boolean }) => {
    Lock.lock(options);
    setLockState(Lock.state());
    setSecurityPhase(options?.clearKey ? 'master-unlock' : 'quick-lock');
  }, []);

  const toggleMaskSensitive = useCallback(() => {
    setMaskSensitive(prev => !prev);
  }, []);

  const openModal = useCallback((type: ModalState['type'], data: ModalState['data'] = null) => {
    setModal({ type, data });
  }, []);

  const closeModal = useCallback(() => {
    setModal({ type: null, data: null });
  }, []);

  const handleUpdateReload = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.getRegistration();
    registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  }, []);

  const totalBalance = useMemo(() => {
    return accounts.reduce((total, acc) => {
      const balance = acc.openingBalance + transactions
        .filter(t => t.accountId === acc.id)
        .reduce((accTotal, t) => (t.type === 'income' ? accTotal + t.amount : accTotal - t.amount), 0);
      return total + balance;
    }, 0);
  }, [accounts, transactions]);

  const contextValue = useMemo(() => ({
    theme,
    toggleTheme,
    accounts,
    transactions,
    debts,
    bills,
    zakat,
    budgets,
    categories: DEFAULT_CATEGORIES,
    isLoading,
    refreshData,
    openModal,
    closeModal,
    maskSensitive,
    toggleMaskSensitive,
    lockApp,
  }), [theme, accounts, transactions, debts, bills, zakat, budgets, isLoading, refreshData, openModal, closeModal, maskSensitive, toggleMaskSensitive, lockApp]);

  const renderSecurityScreen = () => {
    if (securityPhase === 'setup') {
      return <MasterPassphraseSetup onSubmit={handleMasterSetup} />;
    }
    if (securityPhase === 'master-unlock') {
      return (
        <MasterPassphraseUnlock
          onSubmit={handleMasterUnlock}
          attempts={lockState.attempts}
          cooldownUntil={lockState.cooldownUntil}
        />
      );
    }
    if (securityPhase === 'quick-lock') {
      return (
        <Lockscreen
          onUnlock={handleQuickUnlock}
          attempts={lockState.attempts}
          cooldownUntil={lockState.cooldownUntil}
        />
      );
    }
    return null;
  };

  if (securityPhase !== 'ready') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text p-6">
        {renderSecurityScreen()}
      </div>
    );
  }

  return (
    <AppContext.Provider value={contextValue}>
      <div className="bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text min-h-screen font-sans transition-colors duration-300" data-privacy-mask={maskSensitive ? 'true' : undefined}>
        {updateReady && (
          <div className="bg-amber-500 text-white text-sm flex items-center justify-between px-4 py-2">
            <span>Pembaruan aplikasi siap. Muat ulang untuk versi terbaru.</span>
            <button onClick={handleUpdateReload} className="underline font-semibold">Update Aplikasi</button>
          </div>
        )}
        <Header totalBalance={totalBalance} />
        <main className="p-4 md:p-6">
          <Suspense fallback={<div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">Memuat dashboard...</div>}>
            <Dashboard />
          </Suspense>
        </main>
        {modal.type === 'transaction' && (
          <Suspense fallback={null}>
            <TransactionModal isOpen={true} onClose={closeModal} transactionData={modal.data as Transaction | null} />
          </Suspense>
        )}
        {modal.type === 'accounts' && (
          <Suspense fallback={null}>
            <AccountsModal isOpen={true} onClose={closeModal} />
          </Suspense>
        )}
        {modal.type === 'settings' && (
          <Suspense fallback={null}>
            <SettingsModal isOpen={true} onClose={closeModal} />
          </Suspense>
        )}
        {modal.type === 'debt' && (
          <Suspense fallback={null}>
            <DebtModal isOpen={true} onClose={closeModal} />
          </Suspense>
        )}
        {modal.type === 'bills' && (
          <Suspense fallback={null}>
            <BillsModal isOpen={true} onClose={closeModal} />
          </Suspense>
        )}
        {modal.type === 'zakat' && (
          <Suspense fallback={null}>
            <ZakatModal isOpen={true} onClose={closeModal} />
          </Suspense>
        )}
        {modal.type === 'budget' && (
          <Suspense fallback={null}>
            <BudgetModal isOpen={true} onClose={closeModal} />
          </Suspense>
        )}
      </div>
      {lockState.locked && (
        <Lockscreen
          onUnlock={handleQuickUnlock}
          attempts={lockState.attempts}
          cooldownUntil={lockState.cooldownUntil}
        />
      )}
    </AppContext.Provider>
  );
};

export default App;