import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useAppContext } from '../contexts/AppContext';
import dbService from '../services/dbService';
import type { Account, AccountType } from '../types';
import { ACCOUNT_TYPES } from '../constants';

interface AccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
};

const AccountForm: React.FC<{ account?: Account, onDone: () => void, onCancel: () => void }> = ({ account, onDone, onCancel }) => {
    const { refreshData } = useAppContext();
    const [name, setName] = useState(account?.name || '');
    const [type, setType] = useState<AccountType>(account?.type || 'cash');
    const [openingBalance, setOpeningBalance] = useState(String(account?.openingBalance || '0'));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newAccount: Account = {
            id: account?.id || uuidv4(),
            name,
            type,
            currency: 'IDR',
            openingBalance: parseFloat(openingBalance),
            createdAt: account?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        if(account) {
            await dbService.accounts.update(newAccount.id, newAccount);
        } else {
            await dbService.accounts.add(newAccount);
        }
        await refreshData();
        onDone();
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 bg-gray-200 dark:bg-gray-700 rounded-lg space-y-4">
            <h3 className="font-bold text-lg">{account ? 'Edit Akun' : 'Tambah Akun Baru'}</h3>
            <input type="text" placeholder="Nama Akun" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2 bg-light-bg dark:bg-dark-bg rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset focus:outline-none" />
            <select value={type} onChange={e => setType(e.target.value as AccountType)} className="w-full p-2 bg-light-bg dark:bg-dark-bg rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset focus:outline-none appearance-none">
                {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
            <input type="number" placeholder="Saldo Awal" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} required className="w-full p-2 bg-light-bg dark:bg-dark-bg rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset focus:outline-none" />
            <div className="flex justify-end space-x-2">
                <Button type="button" onClick={onCancel}>Batal</Button>
                <Button type="submit" variant="primary">Simpan</Button>
            </div>
        </form>
    )
}

export const AccountsModal: React.FC<AccountsModalProps> = ({ isOpen, onClose }) => {
  const { accounts, transactions, refreshData } = useAppContext();
  const [view, setView] = useState<'list' | 'form'>('list');
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  useEffect(() => {
    if (isOpen) {
        setView('list');
        setSelectedAccount(null);
    }
  }, [isOpen]);

  const calculateBalance = (account: Account) => {
    const balance = transactions
        .filter(t => t.accountId === account.id)
        .reduce((accTotal, t) => {
            if (t.type === 'income') return accTotal + t.amount;
            return accTotal - t.amount;
        }, 0);
    return account.openingBalance + balance;
  }
  
  const handleDelete = async (id: string) => {
      if(window.confirm("Menghapus akun akan menghapus SEMUA transaksi terkait. Apakah Anda yakin?")) {
          await dbService.accounts.delete(id);
          await refreshData();
      }
  }
  
  const handleEdit = (account: Account) => {
    setSelectedAccount(account);
    setView('form');
  }
  
  const handleAdd = () => {
    setSelectedAccount(null);
    setView('form');
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Kelola Akun">
        {view === 'list' ? (
             <div className="space-y-4">
                <Button variant="primary" onClick={handleAdd} className="w-full">Tambah Akun</Button>
                {accounts.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto p-1">
                        {accounts.map(acc => (
                            <div key={acc.id} className="p-3 rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold">{acc.name} <span className="text-xs font-normal bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded-full">{acc.type}</span></p>
                                        <p className="text-lg font-mono">{formatIDR(calculateBalance(acc))}</p>
                                    </div>
                                    <div className="flex space-x-2">
                                        <Button onClick={() => handleEdit(acc)} className="px-3 py-1 text-sm">Edit</Button>
                                        <Button onClick={() => handleDelete(acc.id)} className="px-3 py-1 text-sm bg-red-500 text-white">Hapus</Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-gray-500 py-4">Belum ada akun. Silakan tambah akun baru.</p>
                )}
             </div>
        ) : (
            <AccountForm 
                account={selectedAccount || undefined} 
                onDone={() => setView('list')}
                onCancel={() => setView('list')} 
            />
        )}
    </Modal>
  );
};
