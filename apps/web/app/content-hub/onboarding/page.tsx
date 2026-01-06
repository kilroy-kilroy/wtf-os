'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

type Step = 'org' | 'profile' | 'voice' | 'complete'

export default function ContentHubOnboarding() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('org')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasOrg, setHasOrg] = useState(false)

  // Form state
  const [orgName, setOrgName] = useState('')
  const [title, setTitle] = useState('')
  const [department, setDepartment] = useState('')
  const [platforms, setPlatforms] = useState<string[]>(['linkedin'])
  const [comfortLevel, setComfortLevel] = useState<'distributor' | 'creator'>('distributor')
  const [voiceExamples, setVoiceExamples] = useState(['', '', ''])
  const [voiceDescription, setVoiceDescription] = useState('')

  // Check if user already has an org
  useEffect(() => {
    async function checkOrg() {
      try {
        const res = await fetch('/api/content-engine/orgs')
        const data = await res.json()
        if (data.orgs?.length > 0) {
          setHasOrg(true)
          setStep('profile')
        }
      } catch (err) {
        console.error('Error checking orgs:', err)
      }
    }
    checkOrg()
  }, [])

  const handleCreateOrg = async () => {
    if (!orgName.trim()) {
      setError('Organization name is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/content-engine/orgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orgName }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create organization')
      }

      setStep('profile')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/content-engine/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          department,
          platforms,
          comfort_level: comfortLevel,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save profile')
      }

      setStep('voice')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleCalibrateVoice = async () => {
    const examples = voiceExamples.filter(e => e.trim().length > 50)
    if (examples.length < 3) {
      setError('Please provide at least 3 content examples (each at least 50 characters)')
      return
    }
    if (voiceDescription.trim().length < 10) {
      setError('Please describe your writing voice')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/content-engine/voice/calibrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examples,
          description: voiceDescription,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to calibrate voice')
      }

      // Mark onboarding as complete
      await fetch('/api/content-engine/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboarding_completed: true }),
      })

      setStep('complete')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleSkipVoice = async () => {
    setLoading(true)
    try {
      await fetch('/api/content-engine/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboarding_completed: true }),
      })
      router.push('/content-hub')
    } catch (err) {
      setError('Failed to complete onboarding')
    } finally {
      setLoading(false)
    }
  }

  const togglePlatform = (platform: string) => {
    setPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
  }

  const updateExample = (index: number, value: string) => {
    const newExamples = [...voiceExamples]
    newExamples[index] = value
    setVoiceExamples(newExamples)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#faf8f5] to-[#f5f0e8] flex items-center justify-center p-6">
      <div className="w-full max-w-xl">
        {/* Progress indicator */}
        <div className="flex items-center justify-center mb-8 gap-2">
          {['org', 'profile', 'voice'].map((s, i) => (
            <div
              key={s}
              className={`w-3 h-3 rounded-full transition-colors ${
                step === s ? 'bg-[#c45a3b]' :
                ['org', 'profile', 'voice'].indexOf(step) > i ? 'bg-[#c45a3b]/50' :
                'bg-[#e8e0d5]'
              }`}
            />
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-[#e8e0d5] p-8">
          {/* Step: Create Org */}
          {step === 'org' && (
            <>
              <h1 className="text-2xl font-semibold text-[#2d2a26] mb-2">
                Create your organization
              </h1>
              <p className="text-[#8a8078] mb-6">
                This is where your team's content will live. You can invite others later.
              </p>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="orgName">Organization name</Label>
                  <Input
                    id="orgName"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Acme Agency"
                    className="mt-1"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}

                <Button
                  onClick={handleCreateOrg}
                  disabled={loading || !orgName.trim()}
                  className="w-full bg-[#c45a3b] hover:bg-[#b04a2d]"
                >
                  {loading ? 'Creating...' : 'Continue'}
                </Button>
              </div>
            </>
          )}

          {/* Step: Profile */}
          {step === 'profile' && (
            <>
              <h1 className="text-2xl font-semibold text-[#2d2a26] mb-2">
                Tell us about yourself
              </h1>
              <p className="text-[#8a8078] mb-6">
                This helps us personalize your content experience.
              </p>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Your role/title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Founder, Sales Director, etc."
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="department">Department (optional)</Label>
                  <Input
                    id="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Sales, Marketing, Leadership, etc."
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Platforms you use</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[
                      { id: 'linkedin', label: 'LinkedIn' },
                      { id: 'twitter', label: 'Twitter/X' },
                      { id: 'email', label: 'Email' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        onClick={() => togglePlatform(p.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          platforms.includes(p.id)
                            ? 'bg-[#c45a3b] text-white border-[#c45a3b]'
                            : 'bg-white text-[#6b635a] border-[#e8e0d5] hover:border-[#c45a3b]'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Your content style</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <button
                      onClick={() => setComfortLevel('distributor')}
                      className={`p-4 rounded-lg border text-left transition-colors ${
                        comfortLevel === 'distributor'
                          ? 'border-[#c45a3b] bg-[#c45a3b]/5'
                          : 'border-[#e8e0d5] hover:border-[#c45a3b]'
                      }`}
                    >
                      <p className="font-medium text-[#2d2a26]">Distributor</p>
                      <p className="text-sm text-[#8a8078] mt-1">
                        I mostly repurpose existing content
                      </p>
                    </button>
                    <button
                      onClick={() => setComfortLevel('creator')}
                      className={`p-4 rounded-lg border text-left transition-colors ${
                        comfortLevel === 'creator'
                          ? 'border-[#c45a3b] bg-[#c45a3b]/5'
                          : 'border-[#e8e0d5] hover:border-[#c45a3b]'
                      }`}
                    >
                      <p className="font-medium text-[#2d2a26]">Creator</p>
                      <p className="text-sm text-[#8a8078] mt-1">
                        I create original content too
                      </p>
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}

                <Button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="w-full bg-[#c45a3b] hover:bg-[#b04a2d]"
                >
                  {loading ? 'Saving...' : 'Continue'}
                </Button>
              </div>
            </>
          )}

          {/* Step: Voice Calibration */}
          {step === 'voice' && (
            <>
              <h1 className="text-2xl font-semibold text-[#2d2a26] mb-2">
                Calibrate your voice
              </h1>
              <p className="text-[#8a8078] mb-6">
                Paste 3-5 pieces of content you've written that you love. We'll learn your style.
              </p>

              <div className="space-y-4">
                {voiceExamples.map((example, index) => (
                  <div key={index}>
                    <Label htmlFor={`example-${index}`}>
                      Example {index + 1} {index < 3 && <span className="text-red-500">*</span>}
                    </Label>
                    <Textarea
                      id={`example-${index}`}
                      value={example}
                      onChange={(e) => updateExample(index, e.target.value)}
                      placeholder="Paste a LinkedIn post, email, or other content you've written..."
                      className="mt-1 min-h-[100px]"
                    />
                    <p className="text-xs text-[#8a8078] mt-1">
                      {example.length} characters {example.length < 50 && example.length > 0 && '(need at least 50)'}
                    </p>
                  </div>
                ))}

                <div>
                  <Label htmlFor="voiceDescription">
                    How would you describe your writing voice? <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="voiceDescription"
                    value={voiceDescription}
                    onChange={(e) => setVoiceDescription(e.target.value)}
                    placeholder="Direct and conversational, sometimes irreverent, always practical..."
                    className="mt-1"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleSkipVoice}
                    disabled={loading}
                    className="flex-1"
                  >
                    Skip for now
                  </Button>
                  <Button
                    onClick={handleCalibrateVoice}
                    disabled={loading}
                    className="flex-1 bg-[#c45a3b] hover:bg-[#b04a2d]"
                  >
                    {loading ? 'Calibrating...' : 'Calibrate Voice'}
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Step: Complete */}
          {step === 'complete' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-semibold text-[#2d2a26] mb-2">
                You're all set!
              </h1>
              <p className="text-[#8a8078] mb-6">
                Your voice has been calibrated. Time to start creating content.
              </p>
              <Button
                onClick={() => router.push('/content-hub')}
                className="bg-[#c45a3b] hover:bg-[#b04a2d]"
              >
                Go to Content Hub
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
