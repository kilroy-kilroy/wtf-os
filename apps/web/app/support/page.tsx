'use client';

import { useState } from 'react';

type TicketCategory = 'general' | 'billing' | 'technical' | 'integration' | 'feature';

export default function SupportPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: 'general' as TicketCategory,
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit support request');
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const categories: { value: TicketCategory; label: string }[] = [
    { value: 'general', label: 'General Question' },
    { value: 'billing', label: 'Billing & Subscription' },
    { value: 'technical', label: 'Technical Issue' },
    { value: 'integration', label: 'Integration Help (Zoom, Fireflies, etc.)' },
    { value: 'feature', label: 'Feature Request' },
  ];

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

      <div className="relative z-10 max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="font-anton text-[clamp(28px,4vw,40px)] tracking-[2px] mb-2 leading-none uppercase">
            <span className="text-[#FFDE59]">Support</span> Center
          </h1>
          <p className="text-[#B3B3B3] text-sm mt-2">
            Need help? We&apos;re here for you. Fill out the form below and we&apos;ll get back to you as soon as possible.
          </p>
        </div>

        {submitted ? (
          /* Success State */
          <div className="bg-[#111] border border-[#333] rounded-lg p-8 text-center">
            <div className="text-5xl mb-4">✓</div>
            <h2 className="font-anton text-2xl text-[#FFDE59] mb-3">MESSAGE RECEIVED</h2>
            <p className="text-[#B3B3B3] mb-6">
              Thanks for reaching out! We&apos;ll get back to you within 24-48 hours.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                setFormData({
                  name: '',
                  email: '',
                  category: 'general',
                  subject: '',
                  message: '',
                });
              }}
              className="text-[#FFDE59] hover:text-white transition-colors text-sm"
            >
              Submit another request
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666] mb-2 uppercase">
                  Your Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Smith"
                  className="w-full bg-black border border-[#333] text-white px-4 py-3 text-sm focus:border-[#FFDE59] focus:outline-none transition-colors rounded"
                />
              </div>
              <div>
                <label className="block text-[11px] tracking-[2px] text-[#666] mb-2 uppercase">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@company.com"
                  className="w-full bg-black border border-[#333] text-white px-4 py-3 text-sm focus:border-[#FFDE59] focus:outline-none transition-colors rounded"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-[11px] tracking-[2px] text-[#666] mb-2 uppercase">
                Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as TicketCategory })}
                className="w-full bg-black border border-[#333] text-white px-4 py-3 text-sm focus:border-[#FFDE59] focus:outline-none transition-colors rounded appearance-none cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-[11px] tracking-[2px] text-[#666] mb-2 uppercase">
                Subject *
              </label>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Brief description of your issue"
                className="w-full bg-black border border-[#333] text-white px-4 py-3 text-sm focus:border-[#FFDE59] focus:outline-none transition-colors rounded"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-[11px] tracking-[2px] text-[#666] mb-2 uppercase">
                Message *
              </label>
              <textarea
                required
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Please describe your question or issue in detail..."
                rows={6}
                className="w-full bg-black border border-[#333] text-white px-4 py-3 text-sm focus:border-[#FFDE59] focus:outline-none transition-colors rounded resize-none"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-[#E51B23]/20 border border-[#E51B23] rounded p-4">
                <p className="text-[#E51B23] text-sm">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#E51B23] text-white font-anton tracking-wider py-4 rounded hover:bg-[#c01620] transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase"
            >
              {submitting ? 'Sending...' : 'Submit Support Request'}
            </button>
          </form>
        )}

        {/* Quick Links */}
        <div className="mt-12 pt-8 border-t border-[#333]">
          <h3 className="font-anton text-sm text-[#FFDE59] uppercase tracking-wide mb-4">
            Quick Links
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <a href="/privacy" className="text-[#B3B3B3] hover:text-white transition-colors">
              Privacy Policy
            </a>
            <a href="/terms" className="text-[#B3B3B3] hover:text-white transition-colors">
              Terms of Service
            </a>
            <a href="/settings" className="text-[#B3B3B3] hover:text-white transition-colors">
              Account Settings
            </a>
            <a href="mailto:support@timkilroy.com" className="text-[#B3B3B3] hover:text-white transition-colors">
              Email Us Directly
            </a>
          </div>
        </div>

        {/* Back link */}
        <div className="mt-8 pt-8 border-t border-[#333]">
          <a href="/dashboard" className="text-[#666] hover:text-white transition-colors text-sm">
            &larr; Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
