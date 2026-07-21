import React from 'react';

interface ConsoleHeadingProps {
  children: React.ReactNode;
  /** Visual scale only. Defaults the rendered tag unless `as` overrides it. */
  level?: 1 | 2 | 3;
  /**
   * Semantic tag override. Use when a heading needs level-1 sizing but the page
   * already has its own <h1> (a page may only ever have one).
   */
  as?: 'h1' | 'h2' | 'h3' | 'h4';
  variant?: 'white' | 'yellow' | 'mixed';
  className?: string;
}

export function ConsoleHeading({
  children,
  level = 1,
  as,
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

  const Tag = (as ?? `h${level}`) as keyof JSX.IntrinsicElements;

  return (
    <Tag className={`${baseStyles} ${sizeStyles[level]} ${colorStyles[variant]} ${className}`}>
      {children}
    </Tag>
  );
}
