'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { NavigationDropdown } from './NavigationDropdown';
import { ProfileDropdown } from './ProfileDropdown';

interface GlobalHeaderProps {
  userName?: string;
  userEmail?: string;
}

export function GlobalHeader({ userName, userEmail }: GlobalHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const freeTools = [
    { label: 'Call Lab', href: '/call-lab', description: 'Analyze sales calls' },
    { label: 'Call Lab Instant', href: '/call-lab-instant', description: 'Quick call analysis' },
    { label: 'Discovery Lab', href: '/discovery-lab', description: 'Research prospects' },
    { label: 'Visibility Lab', href: '/visibility-lab', description: 'Track visibility' },
    { label: 'WTF Assessment', href: '/wtf-assessment', description: 'Sales assessment' },
  ];

  const proTools = [
    { label: 'Call Lab Pro', href: '/call-lab-pro', description: 'Advanced call analysis' },
    { label: 'Discovery Lab Pro', href: '/discovery-lab-pro', description: 'Deep prospect research' },
    { label: 'Visibility Lab Pro', href: '/visibility-lab-pro', description: 'Enhanced visibility tracking', comingSoon: true },
  ];

  return (
    <header className="w-full bg-black border-b border-[#333333] sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Left Section: Logo + Navigation */}
          <div className="flex items-center gap-6">
            {/* Logo */}
            <Link
              href="https://timkilroy.com"
              className="flex items-center hover:opacity-80 transition-opacity"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src="/logos/white_logo_transparent_background.png"
                alt="Tim Kilroy"
                width={40}
                height={40}
                className="h-8 w-auto"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <NavigationDropdown label="Free Tools" items={freeTools} />
              <NavigationDropdown label="Pro Tools" items={proTools} />
            </nav>
          </div>

          {/* Right Section: Profile */}
          <div className="flex items-center gap-4">
            {/* Profile - Desktop Only */}
            <div className="hidden md:block">
              <ProfileDropdown userName={userName} userEmail={userEmail} />
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white hover:text-[#FFDE59] transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#333333] py-4">
            {/* User Info */}
            {(userName || userEmail) && (
              <div className="px-2 py-3 mb-4 border-b border-[#333333]">
                <div className="text-[14px] font-medium text-white font-poppins">
                  {userName || 'User'}
                </div>
                {userEmail && (
                  <div className="text-[12px] text-[#666666] mt-0.5">
                    {userEmail}
                  </div>
                )}
              </div>
            )}

            {/* Free Tools */}
            <div className="mb-6">
              <div className="px-2 mb-2 text-[11px] font-semibold text-[#666666] uppercase tracking-wider font-poppins">
                Free Tools
              </div>
              {freeTools.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-2 py-2 text-[14px] font-poppins text-white hover:text-[#FFDE59] transition-colors"
                >
                  {tool.label}
                </Link>
              ))}
            </div>

            {/* Pro Tools */}
            <div className="mb-6">
              <div className="px-2 mb-2 text-[11px] font-semibold text-[#666666] uppercase tracking-wider font-poppins">
                Pro Tools
              </div>
              {proTools.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-2 py-2 text-[14px] font-poppins transition-colors ${
                    tool.comingSoon
                      ? 'text-[#666666] cursor-not-allowed'
                      : 'text-white hover:text-[#FFDE59]'
                  }`}
                >
                  <span>{tool.label}</span>
                  {tool.comingSoon && (
                    <span className="ml-2 text-[10px] text-[#E51B23] font-medium">SOON</span>
                  )}
                </Link>
              ))}
            </div>

            {/* Profile Links */}
            <div className="pt-4 border-t border-[#333333]">
              <Link
                href="/labs"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-2 py-2 text-[14px] font-poppins text-white hover:text-[#FFDE59] transition-colors"
              >
                Your Labs
              </Link>
              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-2 py-2 text-[14px] font-poppins text-white hover:text-[#FFDE59] transition-colors"
              >
                Settings
              </Link>
              <form action="/auth/logout" method="post">
                <button
                  type="submit"
                  className="block w-full text-left px-2 py-2 text-[14px] font-poppins text-[#666666] hover:text-[#E51B23] transition-colors"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
