import React, { useRef } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useAppContext } from '../contexts/AppContext';
import dbService from '../services/dbService';

export const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const { refreshData } = useAppContext();
    const importInputRef = useRef<HTMLInputElement>(null);

    const handleExport = async () => {
        try {
            const accounts = await dbService.accounts.list();
            const transactions = await dbService.transactions.list();
            const debts = await dbService.debts.list();
            const bills = await dbService.bills.list();
            const zakat = await dbService.zakat.list();
            const budgets = await dbService.budgets.list();
            
            const dataToExport = {
                version: '1.0',
                exportedAt: new Date().toISOString(),
                data: {
                    accounts,
                    transactions,
                    debts,
                    bills,
                    zakat,
                    budgets,
                }
            };

            const jsonString = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const date = new Date().toISOString().slice(0, 10);
            a.download = `duit-backup-${date}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to export data:", error);
            alert("Gagal mengekspor data.");
        }
    }

    const handleImportClick = () => {
        importInputRef.current?.click();
    }

    const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                const importedData = JSON.parse(text);

                if (!importedData.data || !importedData.data.accounts) {
                    throw new Error("Invalid backup file format.");
                }

                const confirmed = window.confirm(
                    "PERINGATAN: Ini akan MENGGANTI SEMUA data yang ada saat ini dengan data dari file cadangan. Aksi ini tidak dapat dibatalkan. Lanjutkan?"
                );

                if (confirmed) {
                    await dbService.clearAllData();
                    const { accounts, transactions, debts, bills, zakat, budgets } = importedData.data;
                    
                    // A better implementation would use a single transaction
                    await Promise.all([
                        ...accounts.map((item: any) => dbService.accounts.add(item)),
                        ...transactions.map((item: any) => dbService.transactions.add(item)),
                        ...debts.map((item: any) => dbService.debts.add(item)),
                        ...bills.map((item: any) => dbService.bills.add(item)),
                        ...zakat.map((item: any) => dbService.zakat.add(item)),
                        ...budgets.map((item: any) => dbService.budgets.upsert(item)),
                    ]);
                    
                    await refreshData();
                    alert("Data berhasil diimpor!");
                    onClose();
                }
            } catch (error) {
                console.error("Failed to import data:", error);
                alert(`Gagal mengimpor data: ${error instanceof Error ? error.message : 'Unknown error'}`);
            } finally {
                // Reset file input
                if (importInputRef.current) {
                    importInputRef.current.value = '';
                }
            }
        };
        reader.readAsText(file);
    }
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Pengaturan">
            <div className="space-y-6">
                <div className="p-4 rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset">
                    <h3 className="font-bold mb-2">Manajemen Data</h3>
                    <div className="flex space-x-4">
                        <Button onClick={handleExport} className="flex-1">Ekspor Data</Button>
                        <Button onClick={handleImportClick} className="flex-1">Impor Data</Button>
                        <input type="file" ref={importInputRef} className="hidden" accept=".json" onChange={handleImportFile} />
                    </div>
                     <p className="text-xs text-gray-500 mt-2">Simpan data Anda secara lokal atau pulihkan dari cadangan. Mengimpor akan menimpa semua data saat ini.</p>
                </div>
                 <div className="p-4 rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset">
                    <h3 className="font-bold mb-2">Tentang Aplikasi</h3>
                    <p className="text-sm">duit-keuangan v1.0.0</p>
                    <p className="text-sm">Aplikasi pencatat keuangan pribadi.</p>
                </div>
            </div>
        </Modal>
    );
};
