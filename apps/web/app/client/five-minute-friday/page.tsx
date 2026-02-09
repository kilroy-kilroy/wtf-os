'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import type { FiveMinuteFridaySubmission } from '@/types/client';

export default function FiveMinuteFridayPage() {
  const [formData, setFormData] = useState<FiveMinuteFridaySubmission>({
    worked_on: '',
    working_on_next: '',
    concerned_about: '',
    happy_about: '',
    whats_in_the_way: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function checkStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/client/login'); return; }

      // Check enrollment has 5MF
      const { data: enrollment } = await supabase
        .from('client_enrollments')
        .select('id, program:client_programs(has_five_minute_friday)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (!enrollment?.program?.has_five_minute_friday) {
        router.push('/client/dashboard');
        return;
      }

      // Check if already submitted this week
      const now = new Date();
      const friday = new Date(now);
      friday.setDate(friday.getDate() + (5 - friday.getDay() + 7) % 7);
      if (friday < now) friday.setDate(friday.getDate() + 7);
      const fridayStr = friday.toISOString().split('T')[0];

      const { data: existing } = await supabase
        .from('five_minute_fridays')
        .select('id')
        .eq('user_id', user.id)
        .eq('week_of', fridayStr)
        .single();

      if (existing) {
        setAlreadySubmitted(true);
      }
      setLoading(false);
    }
    checkStatus();
  }, [router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/client/five-minute-friday', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitted(true);
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to submit');
      }
    } catch (err) {
      alert('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#E51B23] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (submitted || alreadySubmitted) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-anton uppercase text-[#FFDE59] mb-4">
            {submitted ? 'Submitted!' : 'Already Done'}
          </h1>
          <p className="text-[#999999] mb-8">
            {submitted
              ? 'Your 5-Minute Friday has been recorded. Tim will review and may respond.'
              : 'You\'ve already submitted your 5-Minute Friday this week. Check back next Friday!'}
          </p>
          <div className="space-x-4">
            <a href="/client/dashboard"
              className="inline-block bg-[#E51B23] text-white px-6 py-3 font-anton uppercase hover:bg-red-700 transition-colors">
              Dashboard
            </a>
            <a href="/client/five-minute-friday/history"
              className="inline-block border border-[#333333] text-[#999999] px-6 py-3 font-anton uppercase hover:border-[#FFDE59] hover:text-white transition-colors">
              View History
            </a>
          </div>
        </div>
      </div>
    );
  }

  const questions = [
    { key: 'worked_on', label: 'What did I work on this week?', required: true, placeholder: 'Key accomplishments, tasks completed, progress made...' },
    { key: 'working_on_next', label: 'What am I going to work on next week?', required: true, placeholder: 'Priorities, goals, planned activities...' },
    { key: 'concerned_about', label: 'What am I concerned about?', required: false, placeholder: 'Worries, risks, things keeping you up at night...' },
    { key: 'happy_about', label: 'What am I happy about?', required: false, placeholder: 'Wins, positive developments, things going well...' },
    { key: 'whats_in_the_way', label: "What's in the way?", required: false, placeholder: 'Blockers, obstacles, things slowing you down...' },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-anton uppercase text-[#E51B23] mb-2">5-Minute Friday</h1>
          <p className="text-[#FFDE59] font-anton tracking-wider">Weekly Check-In</p>
          <p className="text-[#666666] text-sm mt-2">Quick reflection on your week. Takes less than 5 minutes.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {questions.map(({ key, label, required, placeholder }) => (
            <div key={key} className="bg-[#1A1A1A] border border-[#333333] p-6">
              <label className="block text-[#FFDE59] font-anton uppercase text-sm mb-3">
                {label} {required && <span className="text-[#E51B23]">*</span>}
              </label>
              <textarea
                value={(formData as any)[key] || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, [key]: e.target.value }))}
                required={required}
                placeholder={placeholder}
                rows={3}
                className="w-full bg-black border border-[#333333] text-white px-4 py-3 focus:border-[#E51B23] focus:outline-none transition-colors resize-none"
              />
            </div>
          ))}

          <div className="flex justify-between items-center pt-4">
            <a href="/client/dashboard" className="text-[#666666] hover:text-white text-sm transition-colors">
              &larr; Back to Dashboard
            </a>
            <button
              type="submit"
              disabled={isSubmitting || !formData.worked_on || !formData.working_on_next}
              className="bg-[#E51B23] text-white px-8 py-3 font-anton uppercase tracking-wider hover:bg-[#FFDE59] hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
