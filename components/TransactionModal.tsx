import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useAppContext } from '../contexts/AppContext';
import dbService from '../services/dbService';
import geminiService from '../services/geminiService';
import type { Transaction, TransactionType } from '../types';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionData?: Transaction | null;
}

// Mock OCR service - in a real app this would use Tesseract.js
const ocrService = {
  scan: async (file: File): Promise<string> => {
    // This is a mock. In a real app, you would process the image with Tesseract.
    console.log("Scanning file:", file.name);
    await new Promise(resolve => setTimeout(resolve, 2000));
    return `
      TOKO SERBA ADA
      Jl. Pahlawan No. 123
      
      Tanggal: 25/07/2024 14:30
      
      Susu UHT 1L   Rp 18.500
      Roti Tawar    Rp 15.000
      
      TOTAL         Rp 33.500
      TUNAI         Rp 50.000
      KEMBALI       Rp 16.500
    `;
  }
};

export const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, transactionData }) => {
  const { accounts, categories, refreshData } = useAppContext();
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [note, setNote] = useState('');
  const [isOcrLoading, setOcrLoading] = useState(false);
  const [ocrConfidence, setOcrConfidence] = useState<{ [key: string]: number | undefined }>({});
  const [ocrError, setOcrError] = useState<string | null>(null);

  useEffect(() => {
    if (transactionData) {
      setType(transactionData.type);
      setAmount(String(transactionData.amount));
      setAccountId(transactionData.accountId);
      setCategory(transactionData.category);
      setDate(transactionData.date);
      setTime(transactionData.time);
      setNote(transactionData.note || '');
    } else if (accounts.length > 0) {
      setAccountId(accounts[0].id);
      setCategory(categories[1]); // Default to 'Makan & Minum'
    }
    // Reset OCR state on open/data change
    setOcrConfidence({});
    setOcrError(null);
  }, [transactionData, accounts, categories, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId || !amount) {
      alert("Please fill all required fields.");
      return;
    }

    const transaction: Transaction = {
      id: transactionData?.id || uuidv4(),
      type,
      accountId,
      amount: parseFloat(amount),
      category,
      date,
      time,
      note,
      source: Object.keys(ocrConfidence).length > 0 ? 'ocr' : 'manual',
      createdAt: transactionData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (transactionData) {
        await dbService.transactions.update(transaction.id, transaction);
      } else {
        await dbService.transactions.add(transaction);
      }
      await refreshData();
      onClose();
    } catch (error) {
      console.error("Failed to save transaction:", error);
    }
  };
  
  const handleDelete = async () => {
      if(transactionData && window.confirm("Are you sure you want to delete this transaction?")) {
          await dbService.transactions.delete(transactionData.id);
          await refreshData();
          onClose();
      }
  }

  const handleOcrScan = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setOcrConfidence({});
    setOcrError(null);

    try {
      const ocrText = await ocrService.scan(file);
      const parsedData = await geminiService.parseReceipt(ocrText);
      
      if (parsedData.error) {
          setOcrError(parsedData.error);
          return;
      }
      
      const newConfidence: { [key: string]: number } = {};

      if (parsedData.amount.value !== null) {
        setAmount(String(parsedData.amount.value));
        newConfidence.amount = parsedData.amount.confidence;
      }
      if (parsedData.date.value) {
        setDate(parsedData.date.value);
        newConfidence.date = parsedData.date.confidence;
      }
      if (parsedData.time.value) {
        setTime(parsedData.time.value);
        newConfidence.time = parsedData.time.confidence;
      }
      if (parsedData.merchant.value) {
        setNote(parsedData.merchant.value);
        newConfidence.note = parsedData.merchant.confidence;
      }
      
      setOcrConfidence(newConfidence);
      setType('expense');

    } catch (error) {
      console.error("OCR process failed:", error);
      const errorMessage = "Could not parse receipt. Please enter data manually.";
      setOcrError(errorMessage);
    } finally {
      setOcrLoading(false);
    }
  };
  
  const getConfidenceClass = (field: string) => {
    const confidence = ocrConfidence[field];
    if (confidence === undefined) return '';
    if (confidence < 0.5) return 'ring-2 ring-red-500';
    if (confidence < 0.8) return 'ring-2 ring-yellow-500';
    return 'ring-2 ring-green-500';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={transactionData ? 'Edit Transaksi' : 'Tambah Transaksi'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-200 dark:bg-gray-700 rounded-lg">
            <button type="button" onClick={() => setType('income')} className={`p-2 rounded-md font-semibold ${type === 'income' ? 'bg-white dark:bg-dark-bg shadow-md' : ''}`}>Pemasukan</button>
            <button type="button" onClick={() => setType('expense')} className={`p-2 rounded-md font-semibold ${type === 'expense' ? 'bg-white dark:bg-dark-bg shadow-md' : ''}`}>Pengeluaran</button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Jumlah</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required className={`w-full p-3 bg-light-bg dark:bg-dark-bg rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset focus:outline-none transition-all ${getConfidenceClass('amount')}`} />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Akun</label>
          <select value={accountId} onChange={e => setAccountId(e.target.value)} required className="w-full p-3 bg-light-bg dark:bg-dark-bg rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset focus:outline-none">
            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Kategori</label>
          <select value={category} onChange={e => setCategory(e.target.value)} required className="w-full p-3 bg-light-bg dark:bg-dark-bg rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset focus:outline-none">
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium mb-1">Tanggal</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} required className={`w-full p-3 bg-light-bg dark:bg-dark-bg rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset focus:outline-none transition-all ${getConfidenceClass('date')}`} />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Jam</label>
                <input type="time" value={time} onChange={e => setTime(e.target.value)} required className={`w-full p-3 bg-light-bg dark:bg-dark-bg rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset focus:outline-none transition-all ${getConfidenceClass('time')}`} />
            </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Catatan</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} className={`w-full p-3 bg-light-bg dark:bg-dark-bg rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset focus:outline-none transition-all ${getConfidenceClass('note')}`} />
        </div>
        
        <div>
          <label htmlFor="ocr-upload" className="w-full text-center p-3 block bg-light-bg dark:bg-dark-bg rounded-lg shadow-neumorphic-light dark:shadow-neumorphic-dark cursor-pointer active:shadow-neumorphic-light-inset dark:active:shadow-neumorphic-dark-inset">
            {isOcrLoading ? 'Memindai...' : 'Scan Struk (OCR)'}
          </label>
          <input id="ocr-upload" type="file" accept="image/*" className="hidden" onChange={handleOcrScan} disabled={isOcrLoading} />
        </div>

        {(Object.keys(ocrConfidence).length > 0 || ocrError) && (
          <div className="p-3 mt-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-sm shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset">
            {ocrError ? (
                <p className="text-red-500 font-medium">{ocrError}</p>
            ) : (
                <p className="flex items-center flex-wrap">
                    <span className="mr-2 font-medium">Hasil OCR:</span>
                    <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1"></span>Tinggi
                    <span className="inline-block w-3 h-3 rounded-full bg-yellow-500 ml-2 mr-1"></span>Sedang
                    <span className="inline-block w-3 h-3 rounded-full bg-red-500 ml-2 mr-1"></span>Rendah
                </p>
            )}
          </div>
        )}

        <div className="flex justify-between items-center pt-4">
            {transactionData && (
                 <Button type="button" onClick={handleDelete} className="bg-red-500 text-white">Hapus</Button>
            )}
            <div className="flex-grow"></div>
            <Button type="submit" variant="primary">Simpan</Button>
        </div>
      </form>
    </Modal>
  );
};
