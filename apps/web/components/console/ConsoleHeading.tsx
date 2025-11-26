import React from 'react';

interface ConsoleHeadingProps {
  children: React.ReactNode;
  level?: 1 | 2 | 3;
  variant?: 'white' | 'yellow' | 'mixed';
  className?: string;
}

export function ConsoleHeading({
  children,
  level = 1,
  variant = 'white',
  className = ''
}: ConsoleHeadingProps) {
  const baseStyles = 'font-anton uppercase tracking-wide';

  const sizeStyles = {
    1: 'text-4xl md:text-5xl',
    2: 'text-2xl md:text-3xl',
    3: 'text-xl md:text-2xl'
  };

  const colorStyles = {
    white: 'text-white',
    yellow: 'text-[#FFDE59]',
    mixed: 'text-white'
  };

  const Tag = `h${level}` as keyof JSX.IntrinsicElements;

  return (
    <Tag className={`${baseStyles} ${sizeStyles[level]} ${colorStyles[variant]} ${className}`}>
      {children}
    </Tag>
  );
}
