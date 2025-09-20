
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  const baseClasses =
    'p-4 rounded-2xl transition-all duration-300 shadow-neumorphic-light dark:shadow-neumorphic-dark';
  const interactiveClasses = onClick
    ? 'cursor-pointer active:shadow-neumorphic-light-inset dark:active:shadow-neumorphic-dark-inset'
    : '';

  return (
    <div className={`${baseClasses} ${interactiveClasses} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
};
