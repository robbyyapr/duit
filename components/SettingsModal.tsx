
import React from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

export const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {

    const handleExport = () => {
        alert("Fungsi ekspor belum diimplementasikan.");
    }

    const handleImport = () => {
        alert("Fungsi impor belum diimplementasikan.");
    }
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Pengaturan">
            <div className="space-y-6">
                <div className="p-4 rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset">
                    <h3 className="font-bold mb-2">Data</h3>
                    <div className="flex space-x-4">
                        <Button onClick={handleExport} className="flex-1">Ekspor Data</Button>
                        <Button onClick={handleImport} className="flex-1">Impor Data</Button>
                    </div>
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
