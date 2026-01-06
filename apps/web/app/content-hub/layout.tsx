'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface ContentHubLayoutProps {
  children: ReactNode
}

const navItems = [
  { href: '/content-hub', label: 'Dashboard', exact: true },
  { href: '/content-hub/repository', label: 'Repository' },
  { href: '/content-hub/calls', label: 'Calls' },
  { href: '/content-hub/settings', label: 'Settings' },
]

export default function ContentHubLayout({ children }: ContentHubLayoutProps) {
  const pathname = usePathname()

  // Check if we're in onboarding or login flow
  const isOnboarding = pathname?.includes('/onboarding')
  const isLogin = pathname?.includes('/login')
  if (isOnboarding || isLogin) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-[#F8F8F8]" style={{ fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Header with red accent bar */}
      <header className="bg-white sticky top-0 z-50 border-b-[3px] border-[#E51B23]">
        <div className="max-w-[1200px] mx-auto px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link href="/content-hub" className="flex items-center gap-3">
              {/* Red square with CH */}
              <div className="w-9 h-9 bg-[#E51B23] rounded flex items-center justify-center">
                <span
                  className="text-white text-lg tracking-tight"
                  style={{ fontFamily: "'Anton', sans-serif" }}
                >
                  CH
                </span>
              </div>
              <span
                className="text-[22px] text-black tracking-[0.5px]"
                style={{ fontFamily: "'Anton', sans-serif" }}
              >
                CONTENT HUB
              </span>
            </Link>
          </div>

          {/* Nav Items */}
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname?.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'px-5 py-2 rounded text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-[#E51B23] text-white'
                      : 'text-black hover:bg-[#F8F8F8]'
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Add Content Button - Black */}
          <Link
            href="/content-hub/repository"
            className="hidden sm:inline-flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded text-sm font-semibold hover:bg-[#222] transition-all duration-150"
          >
            <span className="text-lg font-light">+</span>
            Add Content
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-[1200px] mx-auto px-8 py-8">
        {children}
      </main>
    </div>
  )
}
