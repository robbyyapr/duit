import React, { useState, useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useAppContext } from '../contexts/AppContext';
import dbService from '../services/dbService';
import type { Debt } from '../types';

const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
};

const DebtForm: React.FC<{ debt?: Debt; onDone: () => void, onCancel: () => void }> = ({ debt, onDone, onCancel }) => {
    const { refreshData } = useAppContext();
    const [type, setType] = useState<Debt['type']>(debt?.type || 'payable');
    const [person, setPerson] = useState(debt?.person || '');
    const [amount, setAmount] = useState(String(debt?.initialAmount || ''));
    const [description, setDescription] = useState(debt?.description || '');
    const [dueDate, setDueDate] = useState(debt?.dueDate || '');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const initialAmount = parseFloat(amount);
        const newDebt: Debt = {
            id: debt?.id || uuidv4(),
            type,
            person,
            initialAmount,
            outstandingAmount: debt ? (debt.initialAmount !== initialAmount ? initialAmount - (debt.initialAmount - debt.outstandingAmount) : debt.outstandingAmount) : initialAmount,
            description,
            dueDate,
            isPaid: debt?.isPaid || false,
            createdAt: debt?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        if (debt) {
            await dbService.debts.update(newDebt.id, newDebt);
        } else {
            await dbService.debts.add(newDebt);
        }
        await refreshData();
        onDone();
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 bg-gray-200 dark:bg-gray-700 rounded-lg space-y-4">
            <h3 className="font-bold text-lg">{debt ? 'Edit' : 'Tambah'} Hutang/Piutang</h3>
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-300 dark:bg-gray-600 rounded-lg">
                <button type="button" onClick={() => setType('payable')} className={`p-2 rounded-md font-semibold ${type === 'payable' ? 'bg-white dark:bg-dark-bg shadow-md' : ''}`}>Hutang Saya</button>
                <button type="button" onClick={() => setType('receivable')} className={`p-2 rounded-md font-semibold ${type === 'receivable' ? 'bg-white dark:bg-dark-bg shadow-md' : ''}`}>Piutang Saya</button>
            </div>
            <input type="text" placeholder="Nama Orang/Lembaga" value={person} onChange={e => setPerson(e.target.value)} required className="w-full p-2 bg-light-bg dark:bg-dark-bg rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset focus:outline-none" />
            <input type="number" placeholder="Jumlah" value={amount} onChange={e => setAmount(e.target.value)} required className="w-full p-2 bg-light-bg dark:bg-dark-bg rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset focus:outline-none" />
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-2 bg-light-bg dark:bg-dark-bg rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset focus:outline-none" />
            <textarea placeholder="Deskripsi (opsional)" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 bg-light-bg dark:bg-dark-bg rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset focus:outline-none" />
            <div className="flex justify-end space-x-2">
                <Button type="button" onClick={onCancel}>Batal</Button>
                <Button type="submit" variant="primary">Simpan</Button>
            </div>
        </form>
    );
};

export const DebtModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { debts, openModal, closeModal } = useAppContext();
    const [view, setView] = useState<'list' | 'form'>('list');
    const [listType, setListType] = useState<'payable' | 'receivable'>('payable');
    const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
    
    useEffect(() => {
        if(isOpen) {
            setView('list');
            setSelectedDebt(null);
        }
    }, [isOpen]);

    const { payables, receivables } = useMemo(() => ({
        payables: debts.filter(d => d.type === 'payable').sort((a,b) => +a.isPaid - +b.isPaid),
        receivables: debts.filter(d => d.type === 'receivable').sort((a,b) => +a.isPaid - +b.isPaid),
    }), [debts]);
    
    const handleRecordPayment = (debt: Debt) => {
        const paymentAmount = prompt(`Masukkan jumlah pembayaran untuk ${debt.person}.\nSisa: ${formatIDR(debt.outstandingAmount)}`, String(debt.outstandingAmount));
        const amount = paymentAmount ? parseFloat(paymentAmount) : 0;
        
        if (amount > 0 && amount <= debt.outstandingAmount) {
            openModal('transaction', {
                type: debt.type === 'payable' ? 'expense' : 'income',
                amount,
                category: debt.type === 'payable' ? 'Hutang' : 'Pemasukan Lain',
                note: `Pembayaran ${debt.type === 'payable' ? 'hutang ke' : 'piutang dari'} ${debt.person}`,
                _debtId: debt.id 
            });
            closeModal(); // Close debt modal to open transaction modal
        } else if (amount > debt.outstandingAmount) {
            alert('Jumlah pembayaran melebihi sisa hutang/piutang.');
        }
    }

    const handleAdd = () => {
        setSelectedDebt(null);
        setView('form');
    }

    const handleEdit = (debt: Debt) => {
        setSelectedDebt(debt);
        setView('form');
    }

    const itemsToShow = listType === 'payable' ? payables : receivables;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Kelola Hutang & Piutang">
            {view === 'list' ? (
                <div className="space-y-4">
                     <Button variant="primary" onClick={handleAdd} className="w-full">Tambah Baru</Button>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-gray-200 dark:bg-gray-700 rounded-lg">
                        <button onClick={() => setListType('payable')} className={`p-2 rounded-md font-semibold ${listType === 'payable' ? 'bg-white dark:bg-dark-bg shadow-md' : ''}`}>Hutang Saya ({payables.length})</button>
                        <button onClick={() => setListType('receivable')} className={`p-2 rounded-md font-semibold ${listType === 'receivable' ? 'bg-white dark:bg-dark-bg shadow-md' : ''}`}>Piutang Saya ({receivables.length})</button>
                    </div>
                    {itemsToShow.length > 0 ? (
                        <div className="space-y-3 max-h-80 overflow-y-auto p-1">
                            {itemsToShow.map(d => (
                                <div key={d.id} className={`p-3 rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset ${d.isPaid ? 'opacity-50' : ''}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold">{d.person}</p>
                                            <p className={`text-lg font-mono ${d.isPaid ? 'line-through' : ''}`}>{formatIDR(d.outstandingAmount)} / {formatIDR(d.initialAmount)}</p>
                                            <p className="text-xs text-gray-500">{d.description || 'Tanpa deskripsi'}</p>
                                        </div>
                                        {!d.isPaid && (
                                            <div className="flex flex-col space-y-1 items-end">
                                                <Button onClick={() => handleRecordPayment(d)} className="px-2 py-1 text-xs">Bayar</Button>
                                                <Button onClick={() => handleEdit(d)} className="px-2 py-1 text-xs">Edit</Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-4">Tidak ada data untuk ditampilkan.</p>
                    )}
                </div>
            ) : (
                <DebtForm 
                    debt={selectedDebt || undefined} 
                    onDone={() => setView('list')} 
                    onCancel={() => setView('list')}
                />
            )}
        </Modal>
    );
};
