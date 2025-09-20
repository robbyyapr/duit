import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useAppContext } from '../contexts/AppContext';
import dbService from '../services/dbService';
import type { Budget } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/solid';

const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
};

const getMonthName = (month: number) => {
    const names = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    return names[month];
}

export const BudgetModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { budgets, categories, refreshData } = useAppContext();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [categoryBudgets, setCategoryBudgets] = useState<{ [category: string]: number }>({});
    const [newCategory, setNewCategory] = useState('');
    const [newAmount, setNewAmount] = useState('');

    const currentMonthId = useMemo(() => currentDate.toISOString().slice(0, 7), [currentDate]);

    const unbudgetedCategories = useMemo(() => {
        const expenseCategories = categories.filter(c => c !== 'Gaji' && c !== 'Investasi' && c !== 'Hutang');
        return expenseCategories.filter(c => !Object.keys(categoryBudgets).includes(c));
    }, [categories, categoryBudgets]);

    useEffect(() => {
        const budget = budgets.find(b => b.id === currentMonthId);
        setCategoryBudgets(budget?.categoryBudgets || {});
    }, [currentMonthId, budgets]);
    
    useEffect(() => {
        // Pre-select first available category when list changes
        if (unbudgetedCategories.length > 0) {
            setNewCategory(unbudgetedCategories[0]);
        } else {
            setNewCategory('');
        }
    }, [unbudgetedCategories]);

    const handleSave = async () => {
        const budgetData: Budget = {
            id: currentMonthId,
            categoryBudgets,
            createdAt: budgets.find(b => b.id === currentMonthId)?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        await dbService.budgets.upsert(budgetData);
        await refreshData();
        alert('Budget berhasil disimpan!');
    };
    
    const handleAddCategory = () => {
        if (!newCategory || !newAmount || parseFloat(newAmount) <= 0) {
            alert("Pilih kategori dan masukkan jumlah yang valid.");
            return;
        }
        setCategoryBudgets(prev => ({
            ...prev,
            [newCategory]: parseFloat(newAmount)
        }));
        setNewAmount('');
    };
    
    const handleRemoveCategory = (category: string) => {
        setCategoryBudgets(prev => {
            const newBudgets = {...prev};
            delete newBudgets[category];
            return newBudgets;
        });
    }
    
    const changeMonth = (amount: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(1); // Avoid issues with month lengths
            newDate.setMonth(newDate.getMonth() + amount);
            return newDate;
        });
    };

    const copyFromPreviousMonth = () => {
        const prevDate = new Date(currentDate);
        prevDate.setDate(1);
        prevDate.setMonth(prevDate.getMonth() - 1);
        const prevMonthId = prevDate.toISOString().slice(0, 7);
        const prevBudget = budgets.find(b => b.id === prevMonthId);
        if (prevBudget) {
            setCategoryBudgets(prevBudget.categoryBudgets);
        } else {
            alert("Tidak ada data budget untuk bulan sebelumnya.");
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Kelola Budget Bulanan">
            <div className="space-y-4">
                <div className="flex justify-between items-center p-2 rounded-lg bg-gray-200 dark:bg-gray-700">
                    <Button onClick={() => changeMonth(-1)} className="p-2"><ChevronLeftIcon className="h-5 w-5"/></Button>
                    <span className="font-bold text-lg">{getMonthName(currentDate.getMonth())} {currentDate.getFullYear()}</span>
                    <Button onClick={() => changeMonth(1)} className="p-2"><ChevronRightIcon className="h-5 w-5"/></Button>
                </div>

                <div className="p-4 rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset space-y-3">
                    <h3 className="font-bold">Tambah Anggaran Kategori</h3>
                    <div className="flex gap-2">
                        <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="w-full p-2 bg-light-bg dark:bg-dark-bg rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset focus:outline-none appearance-none">
                            <option value="">Pilih Kategori</option>
                            {unbudgetedCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <input type="number" placeholder="Jumlah" value={newAmount} onChange={e => setNewAmount(e.target.value)} className="w-48 p-2 bg-light-bg dark:bg-dark-bg rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset focus:outline-none" />
                         <Button onClick={handleAddCategory} className="px-3"><PlusIcon className="h-5 w-5" /></Button>
                    </div>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto p-2">
                    {Object.entries(categoryBudgets).length > 0 ? Object.entries(categoryBudgets).map(([cat, amount]) => (
                        <div key={cat} className="flex items-center justify-between p-3 rounded-lg bg-gray-200 dark:bg-gray-700">
                           <div>
                                <p className="font-semibold">{cat}</p>
                                <p className="text-sm">{formatIDR(amount)}</p>
                           </div>
                           <Button onClick={() => handleRemoveCategory(cat)} className="p-2 bg-red-500 text-white"><TrashIcon className="h-4 w-4"/></Button>
                        </div>
                    )) : <p className="text-center text-sm text-gray-500 p-4">Belum ada budget untuk bulan ini.</p>}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-300 dark:border-gray-600">
                    <Button onClick={copyFromPreviousMonth}>Salin Bulan Lalu</Button>
                    <Button onClick={handleSave} variant="primary">Simpan Budget</Button>
                </div>
            </div>
        </Modal>
    );
};
