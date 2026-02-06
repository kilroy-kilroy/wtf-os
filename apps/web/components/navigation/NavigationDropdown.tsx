'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface DropdownItem {
  label: string;
  href: string;
  description?: string;
  comingSoon?: boolean;
}

interface NavigationDropdownProps {
  label: string;
  items: DropdownItem[];
}

export function NavigationDropdown({ label, items }: NavigationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-[13px] font-poppins text-white hover:text-[#FFDE59] transition-colors duration-200 py-2"
      >
        {label}
        <ChevronDown
          size={16}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-black border border-[#333333] rounded-md shadow-lg z-50">
          <div className="py-2">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`block px-4 py-2 text-[13px] font-poppins transition-colors duration-200 ${
                  item.comingSoon
                    ? 'text-[#666666] cursor-not-allowed'
                    : 'text-white hover:bg-[#1a1a1a] hover:text-[#FFDE59]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{item.label}</span>
                  {item.comingSoon && (
                    <span className="text-[10px] text-[#E51B23] font-medium">SOON</span>
                  )}
                </div>
                {item.description && (
                  <div className="text-[11px] text-[#666666] mt-0.5">
                    {item.description}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
