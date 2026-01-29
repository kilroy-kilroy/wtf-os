'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Form section component
function FormSection({ number, title, note, children }: {
  number: number;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-4">
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#00D4FF] to-[#E31B23] rounded-l-2xl" />
      <div className="flex items-center gap-3 mb-5">
        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00D4FF] to-[#E31B23] flex items-center justify-center text-white text-sm font-bold">
          {number}
        </span>
        <h2 className="text-lg font-bold text-white">{title}</h2>
      </div>
      {note && (
        <div className="bg-[#00D4FF]/10 border-l-2 border-[#00D4FF] rounded-r-lg px-4 py-3 mb-5 text-sm text-[#00D4FF]/80">
          {note}
        </div>
      )}
      {children}
    </div>
  );
}

// Field components
function TextField({ label, name, required, placeholder, helpText, value, onChange, type = 'text' }: {
  label: string; name: string; required?: boolean; placeholder?: string;
  helpText?: string; value: string; onChange: (name: string, value: string) => void;
  type?: string;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-white mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        className="w-full px-4 py-3 bg-slate-700/50 border-2 border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-[#00D4FF] focus:ring-0 focus:outline-none transition-colors text-sm"
      />
      {helpText && <p className="mt-1 text-xs text-slate-500">{helpText}</p>}
    </div>
  );
}

function NumberField({ label, name, required, placeholder, helpText, min, max, step, value, onChange }: {
  label: string; name: string; required?: boolean; placeholder?: string;
  helpText?: string; min?: number; max?: number; step?: number;
  value: string; onChange: (name: string, value: string) => void;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-white mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type="number"
        name={name}
        required={required}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        className="w-full px-4 py-3 bg-slate-700/50 border-2 border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-[#00D4FF] focus:ring-0 focus:outline-none transition-colors text-sm"
      />
      {helpText && <p className="mt-1 text-xs text-slate-500">{helpText}</p>}
    </div>
  );
}

function TextAreaField({ label, name, required, placeholder, helpText, value, onChange }: {
  label: string; name: string; required?: boolean; placeholder?: string;
  helpText?: string; value: string; onChange: (name: string, value: string) => void;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-white mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <textarea
        name={name}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        rows={3}
        className="w-full px-4 py-3 bg-slate-700/50 border-2 border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-[#00D4FF] focus:ring-0 focus:outline-none transition-colors text-sm resize-y"
      />
      {helpText && <p className="mt-1 text-xs text-slate-500">{helpText}</p>}
    </div>
  );
}

function RadioField({ label, name, required, options, value, onChange }: {
  label: string; name: string; required?: boolean;
  options: Array<{ value: string; label: string }>;
  value: string; onChange: (name: string, value: string) => void;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-white mb-2">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div className="space-y-2">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`flex items-center px-4 py-3 rounded-xl border-2 cursor-pointer transition-all text-sm ${
              value === opt.value
                ? 'border-[#00D4FF] bg-[#00D4FF]/10 text-white'
                : 'border-slate-600 bg-slate-700/50 text-slate-400 hover:border-slate-500'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={(e) => onChange(name, e.target.value)}
              className="w-4 h-4 mr-3 accent-[#00D4FF]"
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// CEO Rating options
const CEO_RATING_OPTIONS = (area: string) => [
  { value: `1 - I do most ${area} myself`, label: `1 - I do most ${area} myself` },
  { value: `2 - I'm heavily involved in ${area}`, label: `2 - Heavily involved` },
  { value: `3 - I oversee ${area} but team executes`, label: `3 - I oversee, team executes` },
  { value: `4 - Team handles ${area}, I'm available if needed`, label: `4 - Team handles it, I'm backup` },
  { value: `5 - ${area} function operates independently`, label: `5 - Fully delegated` },
];

const SOP_OPTIONS = [
  { value: 'Yes, comprehensive', label: 'Yes, comprehensive' },
  { value: 'Partial/some documented', label: 'Partial/some docs' },
  { value: 'No, mostly in my head', label: 'No, mostly in my head' },
];

export default function AssessmentPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadingStep, setLoadingStep] = useState(0);
  const [founderName, setFounderName] = useState('');

  // Load gate data from sessionStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('growthos_intake');
      if (stored) {
        const { founderName: name, email, website } = JSON.parse(stored);
        setFounderName(name || '');
        setFormData(prev => ({
          ...prev,
          founderName: name || '',
          email: email || '',
          website: website || '',
          agencyName: prev.agencyName || '',
        }));
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  const handleChange = useCallback((name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  // Calculate progress (sections 2-7 fields only, since section 1 basics came from gate)
  const requiredFields = [
    'agencyName', 'founderLinkedinUrl',
    'annualRevenue', 'targetRevenue', 'netProfit', 'teamSize', 'avgClientValue',
    'clientsAddedPerMonth', 'clientsLostPerMonth', 'newRevenueAnnual', 'churnRevenueAnnual',
    'clientCount', 'avgClientLifetime',
    'referralPercent', 'inboundPercent', 'contentPercent', 'paidPercent', 'outboundPercent',
    'monthlyLeads', 'closeRate',
    'ceoDeliveryRating', 'ceoAccountMgmtRating', 'ceoMarketingRating', 'ceoSalesRating',
    'founderWeeklyHours', 'strategyHoursPerWeek',
    'hasSalesSOP', 'hasDeliverySOP', 'hasAccountMgmtSOP', 'hasMarketingSOP',
    'targetMarket', 'coreOffer', 'hasCaseStudies', 'hasNamedClients'
  ];
  const filledCount = requiredFields.filter(f => formData[f]?.trim()).length;
  const progress = Math.round((filledCount / requiredFields.length) * 100);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Animate loading steps
    const stepInterval = setInterval(() => {
      setLoadingStep(prev => Math.min(prev + 1, 4));
    }, 2500);

    try {
      // Build intake data with proper number parsing
      const numberFields = [
        'annualRevenue', 'targetRevenue', 'netProfit', 'teamSize', 'avgClientValue',
        'clientsAddedPerMonth', 'clientsLostPerMonth', 'newRevenueAnnual', 'churnRevenueAnnual',
        'clientCount', 'avgClientLifetime',
        'referralPercent', 'inboundPercent', 'contentPercent', 'paidPercent', 'outboundPercent', 'partnershipPercent',
        'monthlyLeads', 'closeRate',
        'founderWeeklyHours', 'strategyHoursPerWeek', 'founderPostsPerWeek', 'teamPostsPerWeek'
      ];

      const intakeData: Record<string, any> = { ...formData };
      numberFields.forEach(f => {
        if (intakeData[f]) intakeData[f] = parseFloat(intakeData[f]);
      });

      const response = await fetch('/api/growthos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intakeData,
          userId: 'current' // Server will resolve from session
        })
      });

      const result = await response.json();
      clearInterval(stepInterval);

      if (result.success) {
        router.push(`/growthos/results/${result.data.assessmentId}`);
      } else {
        throw new Error(result.message || 'Assessment failed');
      }
    } catch (err: any) {
      clearInterval(stepInterval);
      setError(err.message);
      setIsSubmitting(false);
      setLoadingStep(0);
    }
  }

  const loadingSteps = [
    'Validating data',
    'Scraping website & LinkedIn',
    'Running visibility & awareness checks',
    'Scoring & generating insights'
  ];

  const firstName = founderName.split(' ')[0] || 'there';

  return (
    <>
      {/* Progress bar */}
      <div className="border-b border-slate-700/50 bg-slate-900/80 px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#00D4FF] to-[#E31B23] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-slate-500">
            <span>Section {Math.min(Math.ceil(progress / 17) || 1, 6)} of 6</span>
            <span>{progress}% complete</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-white mb-2">
            Hi {firstName}! Let&apos;s diagnose your business.
          </h1>
          <p className="text-slate-400">Fill in the details below so we can find what&apos;s holding you back</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Section 1: Remaining Basics */}
          <FormSection number={1} title="A Few More Basics">
            <TextField label="Company Name" name="agencyName" required placeholder="Your agency name" value={formData.agencyName || ''} onChange={handleChange} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField label="Founder LinkedIn URL" name="founderLinkedinUrl" required type="url" placeholder="https://linkedin.com/in/you" helpText="We'll analyze your last 20 posts" value={formData.founderLinkedinUrl || ''} onChange={handleChange} />
              <TextField label="Company LinkedIn URL" name="companyLinkedinUrl" type="url" placeholder="https://linkedin.com/company/you" helpText="Optional" value={formData.companyLinkedinUrl || ''} onChange={handleChange} />
            </div>
          </FormSection>

          {/* Section 2: Revenue & Profit */}
          <FormSection number={2} title="Revenue & Profit">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumberField label="Annual Revenue" name="annualRevenue" required placeholder="e.g., 1500000" helpText="USD" value={formData.annualRevenue || ''} onChange={handleChange} />
              <NumberField label="Target Revenue (12 months)" name="targetRevenue" required placeholder="e.g., 2000000" value={formData.targetRevenue || ''} onChange={handleChange} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumberField label="Net Profit Margin (%)" name="netProfit" required min={0} max={100} placeholder="e.g., 20" helpText="After all expenses" value={formData.netProfit || ''} onChange={handleChange} />
              <NumberField label="Team Size (FTEs)" name="teamSize" required placeholder="e.g., 12" value={formData.teamSize || ''} onChange={handleChange} />
            </div>
            <NumberField label="Average Monthly Retainer" name="avgClientValue" required placeholder="e.g., 5000" helpText="USD per client per month" value={formData.avgClientValue || ''} onChange={handleChange} />
          </FormSection>

          {/* Section 3: Growth & Churn */}
          <FormSection number={3} title="Growth & Churn" note="Critical for diagnosis. Be as accurate as possible.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumberField label="New Clients Per Month" name="clientsAddedPerMonth" required step={0.1} placeholder="e.g., 3" value={formData.clientsAddedPerMonth || ''} onChange={handleChange} />
              <NumberField label="Clients Lost Per Month" name="clientsLostPerMonth" required step={0.1} placeholder="e.g., 1.5" value={formData.clientsLostPerMonth || ''} onChange={handleChange} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumberField label="Annual Revenue from New Clients" name="newRevenueAnnual" required placeholder="e.g., 500000" value={formData.newRevenueAnnual || ''} onChange={handleChange} />
              <NumberField label="Annual Revenue Lost to Churn" name="churnRevenueAnnual" required placeholder="e.g., 200000" value={formData.churnRevenueAnnual || ''} onChange={handleChange} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumberField label="Current Active Clients" name="clientCount" required placeholder="e.g., 25" value={formData.clientCount || ''} onChange={handleChange} />
              <NumberField label="Avg Client Lifetime (months)" name="avgClientLifetime" required placeholder="e.g., 18" value={formData.avgClientLifetime || ''} onChange={handleChange} />
            </div>
          </FormSection>

          {/* Section 4: Lead Sources */}
          <FormSection number={4} title="Where Leads Come From" note="Should total approximately 100%">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <NumberField label="Referrals (%)" name="referralPercent" required min={0} max={100} placeholder="0" value={formData.referralPercent || ''} onChange={handleChange} />
              <NumberField label="Inbound/SEO (%)" name="inboundPercent" required min={0} max={100} placeholder="0" value={formData.inboundPercent || ''} onChange={handleChange} />
              <NumberField label="Content/Social (%)" name="contentPercent" required min={0} max={100} placeholder="0" value={formData.contentPercent || ''} onChange={handleChange} />
              <NumberField label="Paid Ads (%)" name="paidPercent" required min={0} max={100} placeholder="0" value={formData.paidPercent || ''} onChange={handleChange} />
              <NumberField label="Outbound/Cold (%)" name="outboundPercent" required min={0} max={100} placeholder="0" value={formData.outboundPercent || ''} onChange={handleChange} />
              <NumberField label="Partnerships (%)" name="partnershipPercent" min={0} max={100} placeholder="0" value={formData.partnershipPercent || ''} onChange={handleChange} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <NumberField label="Qualified Leads Per Month" name="monthlyLeads" required placeholder="e.g., 15" value={formData.monthlyLeads || ''} onChange={handleChange} />
              <NumberField label="Close Rate (%)" name="closeRate" required min={0} max={100} placeholder="e.g., 25" value={formData.closeRate || ''} onChange={handleChange} />
            </div>
          </FormSection>

          {/* Section 5: Founder Load */}
          <FormSection number={5} title="Founder Load" note="1 = You do it all | 5 = Fully delegated">
            <RadioField label="Client Deliverables" name="ceoDeliveryRating" required options={CEO_RATING_OPTIONS('deliverables')} value={formData.ceoDeliveryRating || ''} onChange={handleChange} />
            <RadioField label="Account Management" name="ceoAccountMgmtRating" required options={CEO_RATING_OPTIONS('account management')} value={formData.ceoAccountMgmtRating || ''} onChange={handleChange} />
            <RadioField label="Marketing" name="ceoMarketingRating" required options={CEO_RATING_OPTIONS('marketing')} value={formData.ceoMarketingRating || ''} onChange={handleChange} />
            <RadioField label="Sales & BD" name="ceoSalesRating" required options={CEO_RATING_OPTIONS('sales')} value={formData.ceoSalesRating || ''} onChange={handleChange} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumberField label="Your Weekly Hours" name="founderWeeklyHours" required placeholder="e.g., 50" value={formData.founderWeeklyHours || ''} onChange={handleChange} />
              <NumberField label="Hours on Strategy / Vision / BD" name="strategyHoursPerWeek" required min={0} max={60} placeholder="e.g., 10" helpText="Working ON vs IN the business" value={formData.strategyHoursPerWeek || ''} onChange={handleChange} />
            </div>
          </FormSection>

          {/* Section 6: Systems & Positioning */}
          <FormSection number={6} title="Systems, Positioning & Visibility">
            <RadioField label="Documented Sales Processes?" name="hasSalesSOP" required options={SOP_OPTIONS} value={formData.hasSalesSOP || ''} onChange={handleChange} />
            <RadioField label="Documented Delivery Processes?" name="hasDeliverySOP" required options={SOP_OPTIONS} value={formData.hasDeliverySOP || ''} onChange={handleChange} />
            <RadioField label="Documented Account Management?" name="hasAccountMgmtSOP" required options={SOP_OPTIONS} value={formData.hasAccountMgmtSOP || ''} onChange={handleChange} />
            <RadioField label="Documented Marketing Processes?" name="hasMarketingSOP" required options={SOP_OPTIONS} value={formData.hasMarketingSOP || ''} onChange={handleChange} />

            <div className="border-t border-slate-700/50 mt-6 pt-6" />

            <RadioField label="Target Client Company Size" name="targetCompanySize" required options={[
              { value: '1-10', label: '1-10 employees' },
              { value: '11-50', label: '11-50 employees' },
              { value: '51-200', label: '51-200 employees' },
              { value: '201-1000', label: '201-1,000 employees' },
              { value: '1000+', label: '1,000+ employees' },
            ]} value={formData.targetCompanySize || ''} onChange={handleChange} />
            <RadioField label="Target Client Industry" name="targetIndustry" required options={[
              { value: 'SaaS / Software', label: 'SaaS / Software' },
              { value: 'E-commerce / DTC', label: 'E-commerce / DTC' },
              { value: 'Professional Services', label: 'Professional Services' },
              { value: 'Healthcare', label: 'Healthcare' },
              { value: 'Financial Services', label: 'Financial Services' },
              { value: 'Real Estate', label: 'Real Estate' },
              { value: 'Manufacturing / Industrial', label: 'Manufacturing / Industrial' },
              { value: 'Education', label: 'Education' },
              { value: 'Other', label: 'Other (specify below)' },
            ]} value={formData.targetIndustry || ''} onChange={handleChange} />
            {formData.targetIndustry === 'Other' && (
              <TextField label="Specify Industry" name="targetIndustryOther" required placeholder="e.g., Crypto / Web3" value={formData.targetIndustryOther || ''} onChange={handleChange} />
            )}
            <TextAreaField label="Who is your ideal client?" name="targetMarket" required placeholder="E.g., B2B SaaS companies with $5M-$20M ARR who need SEO and content" helpText='"Everyone" is wrong.' value={formData.targetMarket || ''} onChange={handleChange} />
            <TextAreaField label="What is your core offer?" name="coreOffer" required placeholder="E.g., Done-for-you SEO + content that drives qualified pipeline" helpText="Your main thing" value={formData.coreOffer || ''} onChange={handleChange} />
            <TextAreaField label="What makes you different?" name="differentiator" placeholder="E.g., We only work with Series A+ SaaS. Our playbook has generated $50M+ in pipeline for clients." helpText="Your unique edge — why should they pick you?" value={formData.differentiator || ''} onChange={handleChange} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumberField label="Founder LinkedIn Posts/Week" name="founderPostsPerWeek" placeholder="e.g., 3" helpText="Optional - we'll verify via scrape" value={formData.founderPostsPerWeek || ''} onChange={handleChange} />
              <NumberField label="Team LinkedIn Posts/Week" name="teamPostsPerWeek" placeholder="e.g., 5" helpText="Optional" value={formData.teamPostsPerWeek || ''} onChange={handleChange} />
            </div>
            <RadioField label="Published Case Studies?" name="hasCaseStudies" required options={[
              { value: 'Yes, multiple (3+)', label: 'Yes, multiple (3+)' },
              { value: 'Yes, 1-2', label: 'Yes, 1-2' },
              { value: 'No', label: 'No' },
            ]} value={formData.hasCaseStudies || ''} onChange={handleChange} />
            <RadioField label="Display Client Logos/Names?" name="hasNamedClients" required options={[
              { value: 'Yes', label: 'Yes' },
              { value: 'No', label: 'No' },
            ]} value={formData.hasNamedClients || ''} onChange={handleChange} />
          </FormSection>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-xl bg-[#E31B23] text-white font-bold text-lg hover:shadow-lg hover:shadow-[#E31B23]/25 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none mt-6"
          >
            {isSubmitting ? 'Analyzing...' : 'Run My Diagnostic'}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}
        </form>
      </div>

      {/* Loading Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-slate-950/95 z-50 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 border-4 border-slate-700 border-t-[#00D4FF] rounded-full animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">Analyzing Your Business</h2>
            <p className="text-slate-400 mb-8">Running diagnostic engine...</p>
            <div className="space-y-3 text-left">
              {loadingSteps.map((step, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 text-sm ${
                    i < loadingStep ? 'text-[#00D4FF]' :
                    i === loadingStep ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  <span className="w-5 text-center">
                    {i < loadingStep ? '\u2713' : '\u25CF'}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
