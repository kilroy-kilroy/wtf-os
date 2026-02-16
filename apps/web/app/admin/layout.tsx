'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/admin', label: 'Dashboard', icon: '\u25A3' },
  { href: '/admin/clients', label: 'Clients', icon: '\u25CB' },
  { href: '/admin/content', label: 'Content', icon: '\u25A1' },
  { href: '/admin/reports', label: 'Reports', icon: '\u25B7' },
  { href: '/admin/five-minute-friday', label: '5-Minute Friday', icon: '\u25C7' },
];

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin';
  return pathname.startsWith(href);
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-56 bg-slate-900 border-r border-slate-800 z-30">
        <div className="px-5 py-6">
          <h1 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
            WTF Admin
          </h1>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV_LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'text-white bg-slate-800/50 border-l-2 border-[#E51B23] pl-[10px]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/30 border-l-2 border-transparent pl-[10px]'
                }`}
              >
                <span className="text-base leading-none">{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-5 py-4 border-t border-slate-800">
          <p className="text-[10px] text-slate-600 uppercase tracking-wider">Command Center</p>
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="md:hidden sticky top-0 z-30 bg-slate-900 border-b border-slate-800">
        <div className="px-4 py-3">
          <h1 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">
            WTF Admin
          </h1>
          <nav className="flex gap-1 overflow-x-auto pb-1">
            {NAV_LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    active
                      ? 'bg-[#E51B23] text-white'
                      : 'text-slate-400 bg-slate-800/50 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content area */}
      <div className="md:ml-56">
        {children}
      </div>
    </div>
  );
}
