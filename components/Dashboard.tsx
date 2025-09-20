import React, { useMemo, useState } from 'react';
import { PlusIcon, UserGroupIcon, PaperClipIcon, ArrowTrendingUpIcon, BanknotesIcon, CalendarDaysIcon, GiftIcon, ScaleIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useAppContext } from '../contexts/AppContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Transaction } from '../types';

const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
};

const BudgetProgress: React.FC<{ category: string; spent: number; budget: number }> = ({ category, spent, budget }) => {
    const percentage = budget > 0 ? (spent / budget) * 100 : 0;
    const progressBarColor = percentage > 100 ? 'bg-red-500' : percentage > 80 ? 'bg-yellow-500' : 'bg-green-500';

    return (
        <div>
            <div className="flex justify-between items-center mb-1 text-sm">
                <span className="font-semibold">{category}</span>
                <span className={`${percentage > 100 ? 'text-red-500 font-bold' : ''}`}>{formatIDR(spent)} / {formatIDR(budget)}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div className={`${progressBarColor} h-2.5 rounded-full`} style={{ width: `${Math.min(percentage, 100)}%` }}></div>
            </div>
        </div>
    );
};


export const Dashboard: React.FC = () => {
  const { openModal, transactions, accounts, categories, debts, bills, zakat, budgets } = useAppContext();

  // State for search, filter, sort, and pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
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
  
  const additionalSummary = useMemo(() => {
    const payable = debts.filter(d => d.type === 'payable' && !d.isPaid).reduce((sum, d) => sum + d.outstandingAmount, 0);
    const receivable = debts.filter(d => d.type === 'receivable' && !d.isPaid).reduce((sum, d) => sum + d.outstandingAmount, 0);
    
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const upcomingBills = bills.filter(b => b.isActive && b.lastPaidMonth !== currentMonth).reduce((sum, b) => sum + b.amount, 0);

    const unpaidZakat = zakat.filter(z => !z.isPaid).reduce((sum, z) => sum + z.amount, 0);

    return { payable, receivable, upcomingBills, unpaidZakat };
  }, [debts, bills, zakat]);

  const budgetSummary = useMemo(() => {
    const currentMonthId = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    const budget = budgets.find(b => b.id === currentMonthId);
    if (!budget || Object.keys(budget.categoryBudgets).length === 0) return [];

    const currentMonthExpenses = transactions.filter(tx => tx.date.startsWith(currentMonthId) && tx.type === 'expense');

    return Object.entries(budget.categoryBudgets).map(([category, budgetAmount]) => {
      const spent = currentMonthExpenses
        .filter(tx => tx.category === category)
        .reduce((sum, tx) => sum + tx.amount, 0);
      return { category, spent, budget: budgetAmount };
    }).sort((a, b) => (b.spent / b.budget) - (a.spent / a.budget));
  }, [budgets, transactions]);


  const expenseChartData = useMemo(() => {
    const expenseByCategory: {[key: string]: number} = {};
    transactions.filter(t => t.type === 'expense').forEach(tx => {
        expenseByCategory[tx.category] = (expenseByCategory[tx.category] || 0) + tx.amount;
    });
    return Object.entries(expenseByCategory).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [transactions]);
  
  const incomeExpenseData = useMemo(() => {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
    return [{ name: 'Income', value: totalIncome }, { name: 'Expense', value: totalExpense }];
  }, [transactions]);

  const processedTransactions = useMemo(() => {
    let processed = [...transactions];
    processed = processed.filter(tx => {
        const searchMatch = searchQuery.toLowerCase()
            ? (tx.note?.toLowerCase().includes(searchQuery.toLowerCase()) || 
               tx.category.toLowerCase().includes(searchQuery.toLowerCase()))
            : true;
        const categoryMatch = filterCategory === 'all' ? true : tx.category === filterCategory;
        const accountMatch = filterAccount === 'all' ? true : tx.accountId === filterAccount;
        const startDateMatch = startDate ? tx.date >= startDate : true;
        const endDateMatch = endDate ? tx.date <= endDate : true;
        return searchMatch && categoryMatch && accountMatch && startDateMatch && endDateMatch;
    });
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
  }, [transactions, searchQuery, filterCategory, filterAccount, sortOrder, startDate, endDate]);

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
            <div><p className="text-sm text-green-500">Pemasukan</p><p className="font-bold">{formatIDR(todaySummary.income)}</p></div>
            <div><p className="text-sm text-red-500">Pengeluaran</p><p className="font-bold">{formatIDR(todaySummary.expense)}</p></div>
            <div><p className="text-sm">Bersih</p><p className="font-bold">{formatIDR(todaySummary.net)}</p></div>
            <div><p className="text-sm">Transaksi</p><p className="font-bold">{todaySummary.count}</p></div>
        </div>
      </Card>

      <Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div><p className="text-sm text-red-500">Hutang Saya</p><p className="font-bold">{formatIDR(additionalSummary.payable)}</p></div>
            <div><p className="text-sm text-green-500">Piutang Saya</p><p className="font-bold">{formatIDR(additionalSummary.receivable)}</p></div>
            <div><p className="text-sm text-yellow-500">Tagihan Bln Ini</p><p className="font-bold">{formatIDR(additionalSummary.upcomingBills)}</p></div>
            <div><p className="text-sm text-blue-500">Zakat Terkumpul</p><p className="font-bold">{formatIDR(additionalSummary.unpaidZakat)}</p></div>
        </div>
      </Card>
      
      <Card>
        <h3 className="font-bold text-lg mb-3">Menu</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Button variant="primary" onClick={() => openModal('transaction')} className="w-full flex items-center justify-center gap-2">
              <PlusIcon className="h-5 w-5" /><span>Transaksi</span>
            </Button>
            <Button onClick={() => openModal('accounts')} className="w-full flex items-center justify-center gap-2">
              <UserGroupIcon className="h-5 w-5" /><span>Akun</span>
            </Button>
            <Button onClick={() => openModal('debt')} className="w-full flex items-center justify-center gap-2">
              <BanknotesIcon className="h-5 w-5" /><span>Hutang</span>
            </Button>
            <Button onClick={() => openModal('bills')} className="w-full flex items-center justify-center gap-2">
              <CalendarDaysIcon className="h-5 w-5" /><span>Tagihan</span>
            </Button>
             <Button onClick={() => openModal('zakat')} className="w-full flex items-center justify-center gap-2">
              <GiftIcon className="h-5 w-5" /><span>Zakat</span>
            </Button>
             <Button onClick={() => openModal('budget')} className="w-full flex items-center justify-center gap-2">
              <ScaleIcon className="h-5 w-5" /><span>Budget</span>
            </Button>
        </div>
      </Card>

      {budgetSummary.length > 0 && (
          <Card>
              <h3 className="font-bold text-lg mb-3">Ringkasan Budget Bulan Ini</h3>
              <div className="space-y-3">
                  {budgetSummary.map(item => (
                      <BudgetProgress key={item.category} {...item} />
                  ))}
              </div>
          </Card>
      )}
      
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
            <h3 className="font-bold mb-4">Pengeluaran per Kategori</h3>
            <ResponsiveContainer width="100%" height={300}>
            <BarChart data={expenseChartData} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" fontSize={12} tickLine={false} axisLine={false} width={100} />
                <Tooltip formatter={(value) => formatIDR(Number(value))} cursor={{fill: 'transparent'}} />
                <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} isAnimationActive={true} animationDuration={800} background={{ fill: '#eee', radius: 4 }} />
            </BarChart>
            </ResponsiveContainer>
        </Card>
        <Card>
            <h3 className="font-bold mb-4">Pemasukan vs Pengeluaran</h3>
            <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie data={incomeExpenseData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label isAnimationActive={true} animationDuration={800}>
                {incomeExpenseData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                </Pie>
                <Tooltip formatter={(value) => formatIDR(Number(value))} />
            </PieChart>
            </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-bold mb-4">Riwayat Transaksi</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 p-3 rounded-lg bg-light-bg dark:bg-dark-bg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset">
          <input type="text" placeholder="Cari (catatan, kategori)..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full p-2 bg-transparent rounded-lg focus:outline-none" />
          <select value={filterAccount} onChange={(e) => { setFilterAccount(e.target.value); setCurrentPage(1); }} className="w-full p-2 bg-transparent rounded-lg focus:outline-none appearance-none">
            <option value="all">Semua Akun</option>
            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
          </select>
          <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }} className="w-full p-2 bg-transparent rounded-lg focus:outline-none appearance-none">
            <option value="all">Semua Kategori</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
           <div className="grid grid-cols-2 gap-2">
             <input type="date" value={startDate} onChange={e => {setStartDate(e.target.value); setCurrentPage(1);}} className="w-full p-2 bg-transparent rounded-lg focus:outline-none" />
             <input type="date" value={endDate} onChange={e => {setEndDate(e.target.value); setCurrentPage(1);}} className="w-full p-2 bg-transparent rounded-lg focus:outline-none" />
           </div>
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-full p-2 bg-transparent rounded-lg focus:outline-none appearance-none col-span-1 md:col-span-2 lg:col-span-1">
            <option value="date-desc">Tanggal (Terbaru)</option><option value="date-asc">Tanggal (Terlama)</option><option value="amount-desc">Jumlah (Tertinggi)</option><option value="amount-asc">Jumlah (Terendah)</option>
          </select>
        </div>
         <div className="space-y-4">
            {paginatedTransactions.map(tx => {
                const account = accounts.find(a => a.id === tx.accountId);
                return (
                    <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg shadow-neumorphic-light-inset dark:shadow-neumorphic-dark-inset cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" onClick={() => openModal('transaction', tx as Transaction)}>
                        <div>
                            <p className="font-semibold flex items-center">{tx.category}{tx.attachment && <PaperClipIcon className="w-4 h-4 ml-2 text-gray-400" />}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{account?.name || 'N/A'} &bull; {tx.date}</p>
                            {tx.note && <p className="text-xs text-gray-400 dark:text-gray-500 italic mt-1">"{tx.note}"</p>}
                        </div>
                        <p className={`font-bold ${tx.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>{tx.type === 'income' ? '+' : '-'} {formatIDR(tx.amount)}</p>
                    </div>
                )
            })}
             {processedTransactions.length === 0 && <p className="text-center text-gray-500 dark:text-gray-400 py-4">Tidak ada transaksi yang cocok dengan filter.</p>}
         </div>
        {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center gap-2"><ChevronLeftIcon className="h-4 w-4" /> Sebelumnya</Button>
                <span>Halaman {currentPage} dari {totalPages}</span>
                <Button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex items-center gap-2">Berikutnya <ChevronRightIcon className="h-4 w-4" /></Button>
            </div>
        )}
      </Card>
    </div>
  );
};
