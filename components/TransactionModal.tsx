import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useAppContext } from '../contexts/AppContext';
import dbService from '../services/dbService';
import geminiService from '../services/geminiService';
import type { Transaction, TransactionType, Zakat } from '../types';
import { XMarkIcon, PaperClipIcon } from '@heroicons/react/24/solid';

const ocrService = {
  scan: async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        // This is a mock; in a real scenario, you'd send this to a service.
        // For this app, we will pass the base64 string or a blob to Gemini.
        // The mock below just returns text.
        resolve(`TOKO SERBA ADA\nJl. Pahlawan No. 123\n\nTanggal: 25/07/2024 14:30\n\nSusu UHT 1L   Rp 18.500\nRoti Tawar    Rp 15.000\n\nTOTAL         Rp 33.500\nTUNAI         Rp 50.000\nKEMBALI       Rp 16.500`);
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }
};


export const TransactionModal: React.FC<{ isOpen: boolean; onClose: () => void; transactionData?: Transaction | null; }> = ({ isOpen, onClose, transactionData }) => {
  const { accounts, categories, refreshData } = useAppContext();
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [originalAccountId, setOriginalAccountId] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [note, setNote] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [isOcrLoading, setOcrLoading] = useState(false);
  const [ocrConfidence, setOcrConfidence] = useState<{ [key: string]: number | undefined }>({});
  const [ocrError, setOcrError] = useState<string | null>(null);

  useEffect(() => {
    if (transactionData) {
      setType(transactionData.type);
      setAmount(String(transactionData.amount));
      setAccountId(transactionData.accountId);
      setOriginalAccountId(transactionData.accountId);
      setCategory(transactionData.category);
      setDate(transactionData.date);
      setTime(transactionData.time);
      setNote(transactionData.note || '');
      setAttachment(transactionData.attachment || null);
    } else {
      // Reset form for new transaction
      setType('expense');
      setAmount('');
      setAccountId(accounts.length > 0 ? accounts[0].id : '');
      setOriginalAccountId(null);
      setCategory(categories.length > 1 ? categories[1] : (categories[0] || ''));
      setDate(new Date().toISOString().slice(0, 10));
      setTime(new Date().toTimeString().slice(0, 5));
      setNote('');
      setAttachment(null);
    }
    setOcrConfidence({});
    setOcrError(null);
  }, [transactionData, accounts, categories, isOpen]);
  
  // Pre-fill form from modal data (for payments from other modals)
  useEffect(() => {
      if(isOpen && transactionData && !transactionData.id) {
          setType(transactionData.type || 'expense');
          setAmount(String(transactionData.amount || ''));
          setCategory(transactionData.category || '');
          setNote(transactionData.note || '');
      }
  }, [isOpen, transactionData]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId || !amount) {
      alert("Please fill all required fields.");
      return;
    }
    
    if (transactionData?.id && originalAccountId && accountId !== originalAccountId) {
        const confirmed = window.confirm(
            "Anda telah mengubah akun untuk transaksi ini. Ini akan menghitung ulang saldo untuk akun lama dan baru. Lanjutkan?"
        );
        if (!confirmed) {
            // Do not close, let user revert. Or close, as is current behavior.
            // Let's close it to prevent accidental saves.
            onClose();
            return; 
        }
    }

    const newTransaction: Transaction = {
      id: transactionData?.id || uuidv4(),
      type,
      accountId,
      amount: parseFloat(amount),
      category,
      date,
      time,
      note,
      attachment: attachment,
      source: Object.keys(ocrConfidence).length > 0 ? 'ocr' : 'manual',
      createdAt: transactionData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (transactionData?.id) {
        await dbService.transactions.update(newTransaction.id, newTransaction);
      } else {
        await dbService.transactions.add(newTransaction);
        
        // Handle post-transaction logic for linked payments
        if (transactionData?._debtId) {
            const debt = await dbService.debts.get(transactionData._debtId);
            if(debt) {
                const newOutstanding = debt.outstandingAmount - newTransaction.amount;
                await dbService.debts.update(debt.id, {
                    outstandingAmount: newOutstanding,
                    isPaid: newOutstanding <= 0,
                });
            }
        }
        if (transactionData?._billId) {
             const bill = await dbService.bills.get(transactionData._billId);
             if(bill) {
                const currentMonth = new Date().toISOString().slice(0, 7);
                await dbService.bills.update(bill.id, { lastPaidMonth: currentMonth });
             }
        }

        // Auto-calculate Zakat for new income
        if (type === 'income') {
          const zakatAmount = parseFloat(amount) * 0.025;
          const newZakat: Zakat = {
            id: uuidv4(),
            transactionId: newTransaction.id,
            amount: zakatAmount,
            isPaid: false,
            createdAt: new Date().toISOString(),
          };
          await dbService.zakat.add(newZakat);
        }
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

  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => setAttachment(reader.result as string);
        reader.readAsDataURL(file);
    }
  }

  const handleOcrScan = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setOcrConfidence({});
    setOcrError(null);

    try {
      const ocrText = await ocrService.scan(file); // This is mocked.
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
      setOcrError("Gagal memproses struk. Silakan masukkan data manual.");
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
    <Modal isOpen={isOpen} onClose={onClose} title={transactionData?.id ? 'Edit Transaksi' : 'Tambah Transaksi'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-200 dark:bg-gray-700 rounded-lg">
            <button type="button" onClick={() => setType('income')} className={`p-2 rounded-md font-semibold ${type === 'income' ? 'bg-white dark:bg-dark-bg shadow-md' : ''}`}>Pemasukan</button>
            <button type="button" onClick={() => setType('expense')} className={`p-2 rounded-md font-semibold ${type === 'expense' ? 'bg-white dark:bg-dark-bg shadow-md' : ''}`}>Pengeluaran</button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Jumlah</label>
          <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required className={`w-full p-3 bg-light-bg dark:bg-dark-bg rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset focus:outline-none transition-all ${getConfidenceClass('amount')}`} />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Akun</label>
          <select value={accountId} onChange={e => setAccountId(e.target.value)} required className="w-full p-3 bg-light-bg dark:bg-dark-bg rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset focus:outline-none appearance-none">
            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Kategori</label>
          <select value={category} onChange={e => setCategory(e.target.value)} required className="w-full p-3 bg-light-bg dark:bg-dark-bg rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset focus:outline-none appearance-none">
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
          <label className="block text-sm font-medium mb-1">Lampiran</label>
            <div className="flex items-center space-x-4">
              <label htmlFor="attachment-upload" className="flex-1 text-center p-3 block bg-light-bg dark:bg-dark-bg rounded-lg shadow-neumorphic-light dark:shadow-neumorphic-dark cursor-pointer active:shadow-neumorphic-light-inset dark:active:shadow-neumorphic-dark-inset flex items-center justify-center gap-2">
                <PaperClipIcon className="w-5 h-5" />
                <span>{attachment ? 'Ganti Lampiran' : 'Pilih Gambar'}</span>
              </label>
              <input id="attachment-upload" type="file" accept="image/*" className="hidden" onChange={handleAttachmentChange} />
            </div>
            {attachment && (<div className="mt-4 relative"><img src={attachment} alt="Attachment preview" className="rounded-lg max-h-40 mx-auto" /><button type="button" onClick={() => setAttachment(null)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-lg" aria-label="Remove attachment"><XMarkIcon className="w-4 h-4" /></button></div>)}
        </div>
        
        <div>
          <label htmlFor="ocr-upload" className="w-full text-center p-3 block bg-light-bg dark:bg-dark-bg rounded-lg shadow-neumorphic-light dark:shadow-neumorphic-dark cursor-pointer active:shadow-neumorphic-light-inset dark:active:shadow-neumorphic-dark-inset">{isOcrLoading ? 'Memindai...' : 'Scan Struk (OCR)'}</label>
          <input id="ocr-upload" type="file" accept="image/*" className="hidden" onChange={handleOcrScan} disabled={isOcrLoading} />
        </div>

        {(Object.keys(ocrConfidence).length > 0 || ocrError) && (
          <div className="p-3 mt-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-sm shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset">
            {ocrError ? (<p className="text-red-500 font-medium">{ocrError}</p>) : (<><p className="font-medium mb-1">Hasil OCR: Harap periksa kembali data yang terisi otomatis.</p><p className="flex items-center flex-wrap"><span className="mr-2 text-xs">Keyakinan:</span><span className="inline-flex items-center mr-2"><span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1"></span><span className="text-xs">Tinggi</span></span><span className="inline-flex items-center mr-2"><span className="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-1"></span><span className="text-xs">Sedang</span></span><span className="inline-flex items-center"><span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-1"></span><span className="text-xs">Rendah</span></span></p></>)}
          </div>
        )}

        <div className="flex justify-between items-center pt-4">
            {transactionData?.id ? (<Button type="button" onClick={handleDelete} className="bg-red-500 text-white">Hapus</Button>) : <div />}
            <div className="flex space-x-2">
                <Button type="button" onClick={onClose}>Batal</Button>
                <Button type="submit" variant="primary">Simpan</Button>
            </div>
        </div>
      </form>
    </Modal>
  );
};
