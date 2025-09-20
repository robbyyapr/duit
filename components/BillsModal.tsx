import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useAppContext } from '../contexts/AppContext';
import dbService from '../services/dbService';
import type { Bill } from '../types';

const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
};

const BillForm: React.FC<{ bill?: Bill; onDone: () => void, onCancel: () => void }> = ({ bill, onDone, onCancel }) => {
    const { refreshData, categories } = useAppContext();
    const [name, setName] = useState(bill?.name || '');
    const [amount, setAmount] = useState(String(bill?.amount || ''));
    const [dueDateDay, setDueDateDay] = useState(String(bill?.dueDateDay || '1'));
    const [category, setCategory] = useState(bill?.category || 'Tagihan');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newBill: Bill = {
            id: bill?.id || uuidv4(),
            name,
            amount: parseFloat(amount),
            dueDateDay: parseInt(dueDateDay),
            category,
            isActive: bill?.isActive ?? true,
            createdAt: bill?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastPaidMonth: bill?.lastPaidMonth,
        };
        if (bill) {
            await dbService.bills.update(newBill.id, newBill);
        } else {
            await dbService.bills.add(newBill);
        }
        await refreshData();
        onDone();
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 bg-gray-200 dark:bg-gray-700 rounded-lg space-y-4">
            <h3 className="font-bold text-lg">{bill ? 'Edit' : 'Tambah'} Tagihan</h3>
            <input type="text" placeholder="Nama Tagihan (e.g. Listrik)" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2 bg-light-bg dark:bg-dark-bg rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset focus:outline-none" />
            <input type="number" placeholder="Jumlah" value={amount} onChange={e => setAmount(e.target.value)} required className="w-full p-2 bg-light-bg dark:bg-dark-bg rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset focus:outline-none" />
            <input type="number" placeholder="Tgl Jatuh Tempo (1-31)" value={dueDateDay} onChange={e => setDueDateDay(e.target.value)} min="1" max="31" required className="w-full p-2 bg-light-bg dark:bg-dark-bg rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset focus:outline-none" />
             <select value={category} onChange={e => setCategory(e.target.value)} required className="w-full p-2 bg-light-bg dark:bg-dark-bg rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset focus:outline-none appearance-none">
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <div className="flex justify-end space-x-2">
                <Button type="button" onClick={onCancel}>Batal</Button>
                <Button type="submit" variant="primary">Simpan</Button>
            </div>
        </form>
    );
};

export const BillsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { bills, openModal, closeModal } = useAppContext();
    const [view, setView] = useState<'list' | 'form'>('list');
    const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

    useEffect(() => {
        if(isOpen) {
            setView('list');
            setSelectedBill(null);
        }
    }, [isOpen]);

    const handlePayBill = (bill: Bill) => {
        openModal('transaction', {
            type: 'expense',
            amount: bill.amount,
            category: bill.category,
            note: `Pembayaran tagihan: ${bill.name}`,
            _billId: bill.id,
        });
        closeModal();
    };

    const handleAdd = () => {
        setSelectedBill(null);
        setView('form');
    };

    const handleEdit = (bill: Bill) => {
        setSelectedBill(bill);
        setView('form');
    };
    
    const currentMonth = new Date().toISOString().slice(0, 7);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Kelola Tagihan Bulanan">
            {view === 'list' ? (
                 <div className="space-y-4">
                    <Button variant="primary" onClick={handleAdd} className="w-full">Tambah Tagihan</Button>
                    {bills.length > 0 ? (
                        <div className="space-y-3 max-h-96 overflow-y-auto p-1">
                            {bills.map(bill => {
                                const isPaid = bill.lastPaidMonth === currentMonth;
                                return (
                                    <div key={bill.id} className={`p-3 rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset ${isPaid ? 'opacity-50' : ''}`}>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-bold">{bill.name}</p>
                                                <p className="text-lg font-mono">{formatIDR(bill.amount)}</p>
                                                <p className="text-xs text-gray-500">Jatuh tempo setiap tgl {bill.dueDateDay}</p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                {isPaid ? (
                                                    <span className="text-sm font-semibold text-green-600">Lunas</span>
                                                ) : (
                                                    <Button onClick={() => handlePayBill(bill)} className="px-3 py-1 text-sm">Bayar</Button>
                                                )}
                                                <Button onClick={() => handleEdit(bill)} className="px-3 py-1 text-sm">Edit</Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                         <p className="text-center text-gray-500 py-4">Belum ada tagihan. Silakan tambah tagihan baru.</p>
                    )}
                 </div>
            ) : (
                <BillForm 
                    bill={selectedBill || undefined} 
                    onDone={() => setView('list')}
                    onCancel={() => setView('list')}
                />
            )}
        </Modal>
    );
};
