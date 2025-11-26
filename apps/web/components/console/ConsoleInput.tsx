import React from 'react';

interface ConsoleInputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label?: string;
  multiline?: boolean;
  rows?: number;
}

export function ConsoleInput({
  label,
  multiline = false,
  rows = 4,
  className = '',
  ...props
}: ConsoleInputProps) {
  const baseStyles = 'w-full bg-[#1a1a1a] border border-[#333333] text-white font-poppins rounded px-4 py-3 focus:outline-none focus:border-[#FFDE59] focus:ring-1 focus:ring-[#FFDE59] placeholder:text-[#B3B3B3] transition-colors';

  const InputComponent = multiline ? 'textarea' : 'input';

  return (
    <div className="space-y-2">
      {label && (
        <label className="block font-anton uppercase text-[#FFDE59] text-sm tracking-wide">
          {label}
        </label>
      )}
      <InputComponent
        className={`${baseStyles} ${className}`}
        rows={multiline ? rows : undefined}
        {...(props as any)}
      />
    </div>
  );
}
