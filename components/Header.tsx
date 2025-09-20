
import React from 'react';
import { SunIcon, MoonIcon, Cog6ToothIcon } from '@heroicons/react/24/solid';
import { useAppContext } from '../contexts/AppContext';

interface HeaderProps {
    totalBalance: number;
}

const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
};

export const Header: React.FC<HeaderProps> = ({ totalBalance }) => {
    const { theme, toggleTheme, openModal } = useAppContext();

    return (
        <header className="sticky top-0 bg-light-bg dark:bg-dark-bg z-40 p-4 shadow-neumorphic-light dark:shadow-neumorphic-dark">
            <div className="flex justify-between items-center max-w-7xl mx-auto">
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Saldo</p>
                    <p className="text-2xl font-bold text-primary">{formatIDR(totalBalance)}</p>
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={toggleTheme} className="p-2 rounded-full transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 active:shadow-neumorphic-light-inset dark:active:shadow-neumorphic-dark-inset">
                        {theme === 'light' ? <MoonIcon className="h-6 w-6" /> : <SunIcon className="h-6 w-6" />}
                    </button>
                     <button onClick={() => openModal('settings')} className="p-2 rounded-full transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 active:shadow-neumorphic-light-inset dark:active:shadow-neumorphic-dark-inset">
                        <Cog6ToothIcon className="h-6 w-6" />
                    </button>
                </div>
            </div>
        </header>
    );
};
