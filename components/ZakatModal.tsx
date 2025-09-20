import React, { useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useAppContext } from '../contexts/AppContext';
import dbService from '../services/dbService';
import type { Transaction } from '../types';

const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
};

export const ZakatModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { zakat, transactions, refreshData, openModal } = useAppContext();

    const unpaidZakat = useMemo(() => zakat.filter(z => !z.isPaid), [zakat]);

    const totalUnpaidAmount = useMemo(() => {
        return unpaidZakat.reduce((sum, z) => sum + z.amount, 0);
    }, [unpaidZakat]);

    const handlePayZakat = async () => {
        if (totalUnpaidAmount <= 0) return;
        
        // This is a simplified flow. A better UX would use a callback after the transaction modal closes successfully.
        const confirmPayment = window.confirm(
            `Ini akan membuat transaksi pengeluaran Zakat sebesar ${formatIDR(totalUnpaidAmount)}. Lanjutkan?`
        );

        if (confirmPayment) {
            const transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'source' | 'accountId'> & { accountId?: string } = {
                type: 'expense',
                amount: totalUnpaidAmount,
                category: 'Zakat',
                note: `Pembayaran Zakat Terkumpul`,
                date: new Date().toISOString().slice(0, 10),
                time: new Date().toTimeString().slice(0, 5),
            };
            openModal('transaction', transaction);
            
            // Mark Zakat as paid.
            // WARNING: This happens immediately, not upon successful transaction.
            // This is a trade-off for simplicity without a complex callback system.
            const idsToPay = unpaidZakat.map(z => z.id);
            await dbService.zakat.markAsPaid(idsToPay);
            await refreshData();
        }
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Kelola Zakat">
            <div className="space-y-4">
                <div className="text-center p-4 rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset">
                    <p className="text-sm">Total Zakat Terkumpul (Belum Dibayar)</p>
                    <p className="text-3xl font-bold text-primary">{formatIDR(totalUnpaidAmount)}</p>
                </div>

                {totalUnpaidAmount > 0 && (
                     <Button variant="primary" onClick={handlePayZakat} className="w-full">
                        Bayar Semua Zakat
                    </Button>
                )}
               
                <div className="space-y-2">
                    <h3 className="font-bold">Rincian Zakat dari Pemasukan:</h3>
                     <div className="max-h-60 overflow-y-auto space-y-2 p-2 rounded-lg bg-gray-200 dark:bg-gray-700">
                        {unpaidZakat.length > 0 ? unpaidZakat.map(z => {
                            const sourceTx = transactions.find(t => t.id === z.transactionId);
                            return (
                                <div key={z.id} className="flex justify-between items-center p-2 bg-light-bg dark:bg-dark-bg rounded-md">
                                    <div>
                                        <p className="font-semibold">{formatIDR(z.amount)}</p>
                                        <p className="text-xs text-gray-500">
                                            Dari: {sourceTx?.category || 'N/A'} ({sourceTx?.date || 'N/A'})
                                        </p>
                                    </div>
                                    <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded-full">
                                        Belum Dibayar
                                    </span>
                                </div>
                            );
                        }) : <p className="text-center text-sm text-gray-500 p-4">Tidak ada zakat yang perlu dibayar.</p>}
                    </div>
                </div>
            </div>
        </Modal>
    );
};
