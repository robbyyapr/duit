
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'default';
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'default',
  className = '',
  ...props
}) => {
  const baseClasses =
    'px-6 py-3 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-light-bg dark:focus:ring-offset-dark-bg focus:ring-primary';

  const variantClasses = {
    default:
      'bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text shadow-neumorphic-light dark:shadow-neumorphic-dark active:shadow-neumorphic-light-inset dark:active:shadow-neumorphic-dark-inset',
    primary:
      'bg-primary text-white shadow-lg active:shadow-inner',
  };

  return (
    <button className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};
