
import React, { useMemo, useState } from 'react';
import { PlusIcon, UserGroupIcon } from '@heroicons/react/24/solid';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useAppContext } from '../contexts/AppContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
};

export const Dashboard: React.FC = () => {
  const { openModal, transactions, accounts, categories } = useAppContext();

  // State for search, filter, sort, and pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [sortOrder, setSortOrder] = useState('date-desc');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const todaySummary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayTxs = transactions.filter(tx => tx.date === today);
    const income = todayTxs.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
    const expense = todayTxs.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
    return { income, expense, net: income - expense, count: todayTxs.length };
  }, [transactions]);
  
  const expenseChartData = useMemo(() => {
    const expenseByCategory: {[key: string]: number} = {};
    transactions.filter(t => t.type === 'expense').forEach(tx => {
        expenseByCategory[tx.category] = (expenseByCategory[tx.category] || 0) + tx.amount;
    });
    return Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }));
  }, [transactions]);
  
  const incomeExpenseData = useMemo(() => {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
    return [{ name: 'Income', value: totalIncome }, { name: 'Expense', value: totalExpense }];
  }, [transactions]);

  const processedTransactions = useMemo(() => {
    let processed = [...transactions];

    // 1. Filter
    processed = processed.filter(tx => {
        const searchMatch = searchQuery.toLowerCase()
            ? (tx.note?.toLowerCase().includes(searchQuery.toLowerCase()) || 
               tx.category.toLowerCase().includes(searchQuery.toLowerCase()))
            : true;
        const categoryMatch = filterCategory === 'all' ? true : tx.category === filterCategory;
        const accountMatch = filterAccount === 'all' ? true : tx.accountId === filterAccount;
        return searchMatch && categoryMatch && accountMatch;
    });

    // 2. Sort
    processed.sort((a, b) => {
        switch (sortOrder) {
            case 'date-asc':
                return new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime();
            case 'amount-desc':
                return b.amount - a.amount;
            case 'amount-asc':
                return a.amount - b.amount;
            case 'date-desc':
            default:
                return new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime();
        }
    });

    return processed;
  }, [transactions, searchQuery, filterCategory, filterAccount, sortOrder]);

  // 3. Paginate
  const totalPages = Math.ceil(processedTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = processedTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );


  const COLORS = ['#4f46e5', '#ef4444'];
  
  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-bold mb-2">Ringkasan Hari Ini</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
                <p className="text-sm text-green-500">Pemasukan</p>
                <p className="font-bold">{formatIDR(todaySummary.income)}</p>
            </div>
            <div>
                <p className="text-sm text-red-500">Pengeluaran</p>
                <p className="font-bold">{formatIDR(todaySummary.expense)}</p>
            </div>
            <div>
                <p className="text-sm">Bersih</p>
                <p className="font-bold">{formatIDR(todaySummary.net)}</p>
            </div>
            <div>
                <p className="text-sm">Transaksi</p>
                <p className="font-bold">{todaySummary.count}</p>
            </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Button variant="primary" onClick={() => openModal('transaction')} className="w-full flex items-center justify-center gap-2">
          <PlusIcon className="h-6 w-6" />
          <span>Tambah Transaksi</span>
        </Button>
        <Button onClick={() => openModal('accounts')} className="w-full flex items-center justify-center gap-2">
            <UserGroupIcon className="h-6 w-6" />
          <span>Kelola Akun</span>
        </Button>
      </div>
      
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
            <h3 className="font-bold mb-4">Pengeluaran per Kategori</h3>
            <ResponsiveContainer width="100%" height={300}>
            <BarChart data={expenseChartData}>
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${formatIDR(Number(value))}`} />
                <Tooltip formatter={(value) => formatIDR(Number(value))} />
                <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
            </ResponsiveContainer>
        </Card>
        <Card>
            <h3 className="font-bold mb-4">Pemasukan vs Pengeluaran</h3>
            <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie data={incomeExpenseData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {incomeExpenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
                </Pie>
                <Tooltip formatter={(value) => formatIDR(Number(value))} />
            </PieChart>
            </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-bold mb-4">Riwayat Transaksi</h2>
        
        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 p-3 rounded-lg bg-light-bg dark:bg-dark-bg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset">
          <input
            type="text"
            placeholder="Cari (catatan, kategori)..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full p-2 bg-light-bg dark:bg-dark-bg rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset focus:outline-none"
          />
          <select
            value={filterAccount}
            onChange={(e) => { setFilterAccount(e.target.value); setCurrentPage(1); }}
            className="w-full p-2 bg-light-bg dark:bg-dark-bg rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset focus:outline-none"
          >
            <option value="all">Semua Akun</option>
            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
          </select>
          <select
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
            className="w-full p-2 bg-light-bg dark:bg-dark-bg rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset focus:outline-none"
          >
            <option value="all">Semua Kategori</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="w-full p-2 bg-light-bg dark:bg-dark-bg rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset focus:outline-none"
          >
            <option value="date-desc">Tanggal (Terbaru)</option>
            <option value="date-asc">Tanggal (Terlama)</option>
            <option value="amount-desc">Jumlah (Tertinggi)</option>
            <option value="amount-asc">Jumlah (Terendah)</option>
          </select>
        </div>

         <div className="space-y-4">
            {paginatedTransactions.map(tx => {
                const account = accounts.find(a => a.id === tx.accountId);
                return (
                    <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" onClick={() => openModal('transaction', tx)}>
                        <div>
                            <p className="font-semibold">{tx.category}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{account?.name || 'N/A'} &bull; {tx.date}</p>
                            {tx.note && <p className="text-xs text-gray-400 dark:text-gray-500 italic mt-1">"{tx.note}"</p>}
                        </div>
                        <p className={`font-bold ${tx.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                            {tx.type === 'income' ? '+' : '-'} {formatIDR(tx.amount)}
                        </p>
                    </div>
                )
            })}
             {processedTransactions.length === 0 && <p className="text-center text-gray-500 dark:text-gray-400 py-4">Tidak ada transaksi yang cocok dengan filter.</p>}
         </div>
        
        {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                    Sebelumnya
                </Button>
                <span>Halaman {currentPage} dari {totalPages}</span>
                <Button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                    Berikutnya
                </Button>
            </div>
        )}
      </Card>

    </div>
  );
};
