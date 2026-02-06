'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { User, Settings, LayoutDashboard, LogOut, FlaskConical } from 'lucide-react';

interface ProfileDropdownProps {
  userName?: string;
  userEmail?: string;
}

export function ProfileDropdown({ userName, userEmail }: ProfileDropdownProps) {
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

  // Get initials from name or email
  const getInitials = () => {
    if (userName) {
      return userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (userEmail) {
      return userEmail[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-[#E51B23] text-white text-[12px] font-semibold font-poppins hover:bg-[#c91820] transition-colors duration-200"
        aria-label="User menu"
      >
        {getInitials()}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-black border border-[#333333] rounded-md shadow-lg z-50">
          {/* User Info */}
          {(userName || userEmail) && (
            <div className="px-4 py-3 border-b border-[#333333]">
              <div className="text-[13px] font-medium text-white font-poppins">
                {userName || 'User'}
              </div>
              {userEmail && (
                <div className="text-[11px] text-[#666666] mt-0.5 truncate">
                  {userEmail}
                </div>
              )}
            </div>
          )}

          {/* Menu Items */}
          <div className="py-2">
            <Link
              href="/labs"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-[13px] font-poppins text-white hover:bg-[#1a1a1a] hover:text-[#FFDE59] transition-colors duration-200"
            >
              <FlaskConical size={16} />
              Your Labs
            </Link>
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-[13px] font-poppins text-white hover:bg-[#1a1a1a] hover:text-[#FFDE59] transition-colors duration-200"
            >
              <Settings size={16} />
              Settings
            </Link>
          </div>

          {/* Logout */}
          <div className="border-t border-[#333333] py-2">
            <form action="/auth/logout" method="post">
              <button
                type="submit"
                className="flex items-center gap-3 w-full px-4 py-2 text-[13px] font-poppins text-[#666666] hover:bg-[#1a1a1a] hover:text-[#E51B23] transition-colors duration-200"
              >
                <LogOut size={16} />
                Logout
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
