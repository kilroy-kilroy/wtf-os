'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function ContentHubLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/content-hub`,
          },
        })
        if (error) throw error
        setError('Check your email for the confirmation link.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error

        // Redirect to Content Hub (will go to onboarding if needed)
        router.push('/content-hub')
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center px-4">
      {/* Content */}
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <Image
              src="/logos/DemandOS Content Hub Horizontal.png"
              alt="DemandOS Content Hub"
              width={280}
              height={60}
              className="h-14 w-auto"
              priority
            />
          </div>
          <p className="text-[#8a8078] text-sm">
            {mode === 'login' ? 'Sign in to access your content' : 'Create your account'}
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white border border-[#e8e0d5] rounded-xl p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#2d2a26] mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#faf8f5] border border-[#e8e0d5] text-[#2d2a26] rounded-lg px-4 py-3 text-base focus:border-[#c45a3b] focus:ring-1 focus:ring-[#c45a3b] focus:outline-none transition-colors"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2d2a26] mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-[#faf8f5] border border-[#e8e0d5] text-[#2d2a26] rounded-lg px-4 py-3 text-base focus:border-[#c45a3b] focus:ring-1 focus:ring-[#c45a3b] focus:outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className={`text-sm rounded-lg p-3 ${error.includes('Check your email') ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#c45a3b] text-white rounded-lg py-3 px-6 font-medium text-base transition-all duration-200 hover:bg-[#b04a2d] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-sm text-[#8a8078] hover:text-[#c45a3b] transition-colors bg-transparent border-none cursor-pointer"
            >
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-[#8a8078]">
          Questions? Email <a href="mailto:tim@timkilroy.com" className="text-[#c45a3b] hover:underline">tim@timkilroy.com</a>
        </div>
      </div>
    </div>
  )
}
