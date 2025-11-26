import React from 'react';

interface ConsolePanelProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'red-highlight';
}

export function ConsolePanel({ children, className = '', variant = 'default' }: ConsolePanelProps) {
  const baseStyles = 'rounded-lg p-6';
  const variantStyles = {
    default: 'bg-black border border-[#E51B23]',
    'red-highlight': 'bg-[#E51B23] border border-[#E51B23]'
  };

  return (
    <div className={`${baseStyles} ${variantStyles[variant]} ${className}`}>
      {children}
    </div>
  );
}
