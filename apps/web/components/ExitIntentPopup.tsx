'use client';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trackEvent, AnalyticsEvents } from '@/lib/analytics';

const STORAGE_KEY = 'exit_popup_dismissed';
const EMAIL_CAPTURED_KEY = 'email_captured';

export function ExitIntentPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');

  const shouldShowPopup = useCallback(() => {
    if (typeof window === 'undefined') return false;

    // Don't show if already dismissed or email captured
    const dismissed = localStorage.getItem(STORAGE_KEY);
    const captured = localStorage.getItem(EMAIL_CAPTURED_KEY);

    return !dismissed && !captured;
  }, []);

  const handleExitIntent = useCallback((e: MouseEvent) => {
    // Trigger when mouse leaves viewport from the top
    if (e.clientY <= 0 && shouldShowPopup()) {
      setIsVisible(true);
      trackEvent('exit_intent_triggered', { location: window.location.pathname });
      // Remove listener after showing once per session
      document.removeEventListener('mouseout', handleExitIntent);
    }
  }, [shouldShowPopup]);

  useEffect(() => {
    // Only add listener if popup should be shown
    if (shouldShowPopup()) {
      document.addEventListener('mouseout', handleExitIntent);
    }

    return () => {
      document.removeEventListener('mouseout', handleExitIntent);
    };
  }, [handleExitIntent, shouldShowPopup]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
    trackEvent('exit_intent_dismissed', { location: window.location.pathname });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/subscribe/workshop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to subscribe');
      }

      setIsSubmitted(true);
      localStorage.setItem(EMAIL_CAPTURED_KEY, 'true');
      trackEvent(AnalyticsEvents.EMAIL_CAPTURED, {
        source: 'exit_intent_popup',
        offer: '2026_planning_workshop',
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        setIsVisible(false);
      }, 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Content */}
        <div className="p-8">
          {!isSubmitted ? (
            <>
              {/* Agency Inner Circle Logo */}
              <div className="flex justify-center mb-6">
                <img
                  src="/logos/Agency Inner Circle Transparent1500.png"
                  alt="Agency Inner Circle"
                  className="h-16 w-auto"
                />
              </div>

              <h2 className="text-2xl font-bold text-center text-gray-900 mb-4">
                Join The Agency Inner Circle
              </h2>

              <p className="text-gray-600 text-center mb-4">
                5,000+ marketing & agency leaders from Google, HubSpot, DEPT, Tinuiti & more ALREADY READ THIS NEWSLETTER. No guru BS, no bro-marketer hacks...just what it takes to find & win clients, create an amazing team, and grow your biz.
              </p>

              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-6">
                <p className="text-indigo-900 text-sm font-medium">
                  <span className="font-bold">BONUS:</span> Subscribe today and get access to the 2026 Agency Planning Workshop. 90 min of agency annual planning that works.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  type="text"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full"
                />
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full"
                />

                {error && (
                  <p className="text-red-500 text-sm text-center">{error}</p>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3"
                >
                  {isSubmitting ? 'Subscribing...' : 'Subscribe & Get Workshop Access'}
                </Button>
              </form>

              <p className="text-xs text-gray-400 text-center mt-4">
                No spam. Unsubscribe anytime.
              </p>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Thank you!</h3>
              <p className="text-gray-600">
                Your resources are on their way!
              </p>
              <p className="text-gray-500 text-sm mt-2">
                If you don't see them in the next few minutes, check your spam folder...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
