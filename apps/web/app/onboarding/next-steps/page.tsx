'use client';

import { useEffect, useState, Suspense } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

type CardProps = {
  title: string;
  description: string;
  buttonText: string;
  href: string;
  variant?: 'primary' | 'secondary';
  badge?: string;
};

function ActionCard({ title, description, buttonText, href, variant = 'secondary', badge }: CardProps) {
  const isPrimary = variant === 'primary';

  return (
    <div className={`bg-[#1A1A1A] border ${isPrimary ? 'border-[#E51B23]' : 'border-[#333333]'} p-6 rounded-lg relative flex flex-col h-full`}>
      {isPrimary && (
        <div className="absolute top-0 left-0 w-1 h-full bg-[#E51B23] rounded-l-lg" />
      )}
      {badge && (
        <span className="absolute -top-3 left-4 bg-[#E51B23] text-white text-[10px] font-anton tracking-wider px-2 py-1 rounded">
          {badge}
        </span>
      )}

      <h3 className="font-anton text-xl text-white uppercase tracking-wide mb-2">
        {title}
      </h3>
      <p className="text-[#B3B3B3] text-sm mb-6 flex-grow">
        {description}
      </p>
      <Link
        href={href}
        className={`block text-center py-3 px-4 font-anton text-sm uppercase tracking-wider rounded transition-all duration-300 ${
          isPrimary
            ? 'bg-[#E51B23] text-white hover:bg-[#FFDE59] hover:text-black'
            : 'bg-transparent border border-[#FFDE59] text-[#FFDE59] hover:bg-[#FFDE59] hover:text-black'
        }`}
      >
        {buttonText}
      </Link>
    </div>
  );
}

function NextStepsContent() {
  const [userName, setUserName] = useState('');
  const [mode, setMode] = useState<'solo' | 'team'>('solo');
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      // Get mode from URL or user data
      const urlMode = searchParams.get('mode');
      if (urlMode === 'team' || urlMode === 'solo') {
        setMode(urlMode);
      }

      // Get user info
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Try to get full name from users table
        const { data: userData } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', user.id)
          .single();

        const name = userData?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'there';
        setUserName(name.split(' ')[0]); // First name only

        // Mark onboarding as completed
        await supabase
          .from('users')
          .update({ onboarding_completed: true })
          .eq('id', user.id);
      }

      setIsLoading(false);
    };

    init();
  }, [supabase, searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-[#FFDE59] font-anton text-xl">Loading...</div>
      </div>
    );
  }

  // Solo variant: Analyze → Dashboard → Invite
  const soloCards: CardProps[] = [
    {
      title: 'Analyze a Call',
      description: 'Upload a call or paste a transcript and get a full Call Lab Pro breakdown in a few minutes.',
      buttonText: 'Analyze a call',
      href: '/call-lab/pro',
      variant: 'primary',
      badge: 'RECOMMENDED',
    },
    {
      title: 'Check out your Dashboard',
      description: 'See your workspace, call history, and how grading works. We\'ll guide you with empty state examples.',
      buttonText: 'Go to dashboard',
      href: '/dashboard',
    },
    {
      title: 'Invite Teammates',
      description: 'Bring in a teammate so you can compare calls, scores, and coaching in one place.',
      buttonText: 'Invite teammates',
      href: '/onboarding/invite',
    },
  ];

  // Team variant: Invite → Analyze → Dashboard
  const teamCards: CardProps[] = [
    {
      title: 'Invite Your Team',
      description: 'Send invites to reps and leaders so everyone can upload calls, get grades, and see the same scoreboard.',
      buttonText: 'Invite teammates',
      href: '/onboarding/invite',
      variant: 'primary',
      badge: 'RECOMMENDED',
    },
    {
      title: 'Analyze a Call',
      description: 'Upload a call or paste a transcript and see how Call Lab Pro scores and breaks it down.',
      buttonText: 'Analyze a call',
      href: '/call-lab/pro',
    },
    {
      title: 'Check out the Dashboard',
      description: 'Preview your team workspace, see how scores will appear, and review coaching insights.',
      buttonText: 'Go to dashboard',
      href: '/dashboard',
    },
  ];

  const cards = mode === 'team' ? teamCards : soloCards;
  const helperText = mode === 'team'
    ? 'Not sure where to start? Invite your team.'
    : 'Not sure where to start? Analyze a call. You\'ll see the value in one call.';

  return (
    <div className="min-h-screen bg-black text-white font-poppins py-12 px-4">
      {/* Background Effects */}
      <div className="fixed top-0 left-0 right-0 bottom-0 pointer-events-none z-0">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(229, 27, 35, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(229, 27, 35, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block bg-[#E51B23]/20 border border-[#E51B23] text-[#E51B23] text-xs font-anton tracking-wider px-3 py-1 rounded mb-4">
            SETUP COMPLETE
          </div>
          <h1 className="font-anton text-[clamp(32px,5vw,48px)] tracking-[3px] mb-3 leading-none uppercase">
            YOU&apos;RE ALL SET, <span className="text-[#FFDE59]">{userName.toUpperCase()}</span>
          </h1>
          <p className="text-[#B3B3B3] text-lg">
            What do you want to do first?
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {cards.map((card, index) => (
            <ActionCard key={index} {...card} />
          ))}
        </div>

        {/* Helper Text */}
        <p className="text-center text-sm text-[#777]">
          {helperText}
        </p>
      </div>
    </div>
  );
}

export default function NextStepsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-[#FFDE59] font-anton text-xl">Loading...</div>
      </div>
    }>
      <NextStepsContent />
    </Suspense>
  );
}
