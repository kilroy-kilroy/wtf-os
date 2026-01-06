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
  { href: '/content-hub/settings', label: 'Settings' },
]

export default function ContentHubLayout({ children }: ContentHubLayoutProps) {
  const pathname = usePathname()

  // Check if we're in onboarding flow
  const isOnboarding = pathname?.includes('/onboarding')
  if (isOnboarding) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      {/* Header */}
      <header className="border-b border-[#e8e0d5] bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/content-hub" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#c45a3b] rounded-lg" />
              <span className="text-lg font-medium text-[#2d2a26]">Content Hub</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname?.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-[#c45a3b]/10 text-[#c45a3b]'
                        : 'text-[#6b635a] hover:bg-[#f5f0e8] hover:text-[#2d2a26]'
                    )}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/content-hub/repository"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-[#c45a3b] text-white rounded-lg text-sm font-medium hover:bg-[#b04a2d] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Content
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
