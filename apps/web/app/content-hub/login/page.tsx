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
    <div
      className="min-h-screen bg-[#F8F8F8] flex items-center justify-center px-4"
      style={{ fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif" }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <Image
              src="/logos/Content Hub SQ Red Black - Transparent.png"
              alt="Content Hub"
              width={120}
              height={120}
              className="h-24 w-auto"
              priority
            />
          </div>
          <p className="text-[#666666] text-sm">
            {mode === 'login' ? 'Sign in to access your content' : 'Create your account'}
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white rounded-xl overflow-hidden shadow-sm border-t-4 border-[#E51B23]">
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[13px] font-medium text-[#666666] uppercase tracking-[0.5px] mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-white border-2 border-[#E5E5E5] text-black rounded-lg px-4 py-3 text-base focus:border-[#E51B23] focus:outline-none transition-colors"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                  placeholder="you@company.com"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#666666] uppercase tracking-[0.5px] mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-white border-2 border-[#E5E5E5] text-black rounded-lg px-4 py-3 text-base focus:border-[#E51B23] focus:outline-none transition-colors"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div
                  className={`text-sm rounded-lg p-3 ${
                    error.includes('Check your email')
                      ? 'bg-[#FEF3C7] text-[#92400E]'
                      : 'bg-red-50 text-[#EF4444]'
                  }`}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#E51B23] text-white rounded-lg py-3.5 px-6 font-semibold text-base transition-all duration-150 hover:bg-[#CC171F] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing in...' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-sm text-[#666666] hover:text-[#E51B23] transition-colors bg-transparent border-none cursor-pointer"
              >
                {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-[#666666]">
          Questions? Email{' '}
          <a href="mailto:tim@timkilroy.com" className="text-[#E51B23] font-semibold hover:underline">
            tim@timkilroy.com
          </a>
        </div>
      </div>
    </div>
  )
}
