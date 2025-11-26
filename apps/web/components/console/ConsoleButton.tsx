import React from 'react';

interface ConsoleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  fullWidth?: boolean;
}

export function ConsoleButton({
  children,
  variant = 'primary',
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ConsoleButtonProps) {
  const baseStyles = 'font-anton uppercase tracking-wide py-3 px-6 rounded transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    primary: 'bg-[#E51B23] text-white hover:bg-[#C41820] active:bg-[#A01519]',
    secondary: 'bg-black border border-[#FFDE59] text-[#FFDE59] hover:bg-[#FFDE59] hover:text-black',
    ghost: 'bg-transparent text-white border border-white hover:bg-white hover:text-black'
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${widthStyle} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
