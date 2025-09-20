
import React from 'react';
import type { AppContextType } from '../types';

export const AppContext = React.createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const context = React.useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
