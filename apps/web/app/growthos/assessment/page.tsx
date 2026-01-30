'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
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

function NumberField({ label, name, required, placeholder, helpText, min, max, step, value, onChange, prefix }: {
  label: string; name: string; required?: boolean; placeholder?: string;
  helpText?: string; min?: number; max?: number; step?: number;
  value: string; onChange: (name: string, value: string) => void;
  prefix?: string;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-white mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{prefix}</span>
        )}
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
          className={`w-full px-4 py-3 bg-slate-700/50 border-2 border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-[#00D4FF] focus:ring-0 focus:outline-none transition-colors text-sm ${prefix ? 'pl-8' : ''}`}
        />
      </div>
      {helpText && <p className="mt-1 text-xs text-slate-500">{helpText}</p>}
    </div>
  );
}

function TextAreaField({ label, name, required, placeholder, helpText, value, onChange, maxLength }: {
  label: string; name: string; required?: boolean; placeholder?: string;
  helpText?: string; value: string; onChange: (name: string, value: string) => void;
  maxLength?: number;
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
        maxLength={maxLength}
        className="w-full px-4 py-3 bg-slate-700/50 border-2 border-slate-600 rounded-xl text-white placeholder-slate-500 focus:border-[#00D4FF] focus:ring-0 focus:outline-none transition-colors text-sm resize-y"
      />
      {helpText && <p className="mt-1 text-xs text-slate-500">{helpText}</p>}
      {maxLength && value && (
        <p className="mt-1 text-xs text-slate-600">{value.length}/{maxLength}</p>
      )}
    </div>
  );
}

function SelectField({ label, name, required, options, value, onChange, helpText }: {
  label: string; name: string; required?: boolean;
  options: Array<{ value: string; label: string }>;
  value: string; onChange: (name: string, value: string) => void;
  helpText?: string;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-white mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <select
        name={name}
        required={required}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        className="w-full px-4 py-3 bg-slate-700/50 border-2 border-slate-600 rounded-xl text-white focus:border-[#00D4FF] focus:ring-0 focus:outline-none transition-colors text-sm appearance-none"
      >
        <option value="" className="bg-slate-800">Select...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-slate-800">{opt.label}</option>
        ))}
      </select>
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

function CheckboxField({ label, name, required, options, values, onToggle, helpText }: {
  label: string; name: string; required?: boolean;
  options: Array<{ value: string; label: string }>;
  values: string[]; onToggle: (name: string, value: string) => void;
  helpText?: string;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-white mb-2">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {helpText && <p className="text-xs text-slate-500 mb-2">{helpText}</p>}
      <div className="space-y-2">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`flex items-center px-4 py-3 rounded-xl border-2 cursor-pointer transition-all text-sm ${
              values.includes(opt.value)
                ? 'border-[#00D4FF] bg-[#00D4FF]/10 text-white'
                : 'border-slate-600 bg-slate-700/50 text-slate-400 hover:border-slate-500'
            }`}
          >
            <input
              type="checkbox"
              name={name}
              value={opt.value}
              checked={values.includes(opt.value)}
              onChange={() => onToggle(name, opt.value)}
              className="w-4 h-4 mr-3 accent-[#00D4FF] rounded"
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function RatingField({ label, name, helpText, value, onChange }: {
  label: string; name: string; helpText?: string;
  value: string; onChange: (name: string, value: string) => void;
}) {
  const ratings = [
    { value: '1', label: '1 — I do almost everything' },
    { value: '2', label: '2 — Heavily involved' },
    { value: '3', label: '3 — I oversee, team executes' },
    { value: '4', label: '4 — Team handles, I\'m backup' },
    { value: '5', label: '5 — Fully delegated' },
  ];
  return (
    <div className="mb-4 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
      <label className="block text-sm font-semibold text-white mb-2">
        {label} <span className="text-red-400">*</span>
      </label>
      {helpText && <p className="text-xs text-slate-500 mb-2">{helpText}</p>}
      <div className="flex gap-2">
        {ratings.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => onChange(name, r.value)}
            title={r.label}
            className={`flex-1 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
              value === r.value
                ? 'border-[#00D4FF] bg-[#00D4FF]/20 text-[#00D4FF] shadow-[0_0_8px_rgba(0,212,255,0.3)]'
                : 'border-slate-500 bg-slate-700/80 text-slate-300 hover:border-slate-400 hover:bg-slate-700'
            }`}
          >
            {r.value}
          </button>
        ))}
      </div>
      <div className="flex justify-between mt-1.5 text-[10px] text-slate-500">
        <span>I do everything</span>
        <span>Fully delegated</span>
      </div>
    </div>
  );
}

// SOP Options
const SOP_OPTIONS = [
  { value: 'Yes', label: 'Yes' },
  { value: 'Partial', label: 'Partial' },
  { value: 'No', label: 'No' },
];

// Industry options
const INDUSTRY_OPTIONS = [
  { value: 'SaaS / Software', label: 'SaaS / Software' },
  { value: 'E-commerce / DTC', label: 'E-commerce / DTC' },
  { value: 'Professional Services', label: 'Professional Services' },
  { value: 'Healthcare', label: 'Healthcare' },
  { value: 'Financial Services', label: 'Financial Services' },
  { value: 'Real Estate', label: 'Real Estate' },
  { value: 'Manufacturing / Industrial', label: 'Manufacturing / Industrial' },
  { value: 'Education', label: 'Education' },
  { value: 'Other', label: 'Other (specify below)' },
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

  // For multiselect checkbox fields (stored as comma-separated string)
  const handleToggle = useCallback((name: string, value: string) => {
    setFormData(prev => {
      const current = prev[name] ? prev[name].split(',').filter(Boolean) : [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [name]: updated.join(',') };
    });
  }, []);

  // Churn calculation for calibration display
  const churnEstimate = useMemo(() => {
    const lastMonthRevenue = parseFloat(formData.lastMonthRevenue || '0');
    const currentClients = parseInt(formData.currentClients || '0');
    const clientsLostAnnual = formData.clientsLostAnnual;

    if (!lastMonthRevenue || !currentClients || !clientsLostAnnual) return null;

    const midpoints: Record<string, number> = { '0-2': 1, '3-5': 4, '6-10': 8, '11-15': 13, '16+': 20 };
    const mid = midpoints[clientsLostAnnual];
    if (mid === undefined) return null;

    const avgClientValue = lastMonthRevenue / currentClients;
    const estimatedMonthlyChurn = (mid / 12) * avgClientValue;
    const churnRatePercent = (estimatedMonthlyChurn / lastMonthRevenue) * 100;

    return {
      monthlyChurn: Math.round(estimatedMonthlyChurn),
      churnRate: churnRatePercent.toFixed(1),
    };
  }, [formData.lastMonthRevenue, formData.currentClients, formData.clientsLostAnnual]);

  // Lead source total
  const leadSourceTotal = useMemo(() => {
    return ['referralPercent', 'inboundPercent', 'contentPercent', 'paidPercent', 'outboundPercent', 'partnershipPercent']
      .reduce((sum, f) => sum + (parseFloat(formData[f] || '0') || 0), 0);
  }, [formData]);

  // Calculate progress
  const requiredFields = [
    'agencyName', 'founderLinkedinUrl', 'teamSize',
    'lastYearRevenue', 'targetRevenue', 'netProfitMargin', 'lastMonthRevenue',
    'currentClients', 'clientsLostAnnual', 'clientsAddedAnnual', 'churnCalibration',
    'referralPercent', 'inboundPercent', 'contentPercent', 'paidPercent', 'outboundPercent',
    'monthlyLeads', 'closeRate',
    'founderWeeklyHours', 'strategyHoursPerWeek',
    'ceoDeliveryRating', 'ceoAccountMgmtRating', 'ceoMarketingRating', 'ceoSalesRating',
    'hasSalesSOP', 'hasDeliverySOP', 'hasAccountMgmtSOP', 'hasMarketingSOP',
    'targetCompanySize', 'targetIndustry', 'statedICP', 'coreOffer', 'differentiator',
    'founderPostsPerWeek', 'hasCaseStudies', 'hasNamedClients',
  ];
  const filledCount = requiredFields.filter(f => formData[f]?.trim()).length;
  const progress = Math.round((filledCount / requiredFields.length) * 100);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Validate lead source sum
    if (Math.abs(leadSourceTotal - 100) > 5) {
      setError('Lead source percentages must sum to approximately 100%.');
      setIsSubmitting(false);
      return;
    }

    const stepInterval = setInterval(() => {
      setLoadingStep(prev => Math.min(prev + 1, 4));
    }, 2500);

    try {
      const numberFields = [
        'lastYearRevenue', 'targetRevenue', 'lastMonthRevenue', 'teamSize',
        'currentClients',
        'referralPercent', 'inboundPercent', 'contentPercent', 'paidPercent', 'outboundPercent', 'partnershipPercent',
        'monthlyLeads',
        'founderWeeklyHours', 'strategyHoursPerWeek',
        'ceoDeliveryRating', 'ceoAccountMgmtRating', 'ceoMarketingRating', 'ceoSalesRating',
        'founderPostsPerWeek', 'teamPostsPerWeek',
      ];

      const intakeData: Record<string, any> = { ...formData };
      numberFields.forEach(f => {
        if (intakeData[f]) intakeData[f] = parseFloat(intakeData[f]);
      });

      // Map v2 fields to v1 compatibility fields
      intakeData.annualRevenue = intakeData.lastYearRevenue || (intakeData.lastMonthRevenue * 12);
      intakeData.netProfit = parseFloat(intakeData.netProfitMargin?.replace(/[^0-9.]/g, '') || '15');
      intakeData.clientCount = intakeData.currentClients;
      intakeData.avgClientValue = intakeData.lastMonthRevenue / (intakeData.currentClients || 1);
      intakeData.targetMarket = intakeData.statedICP || '';

      // Estimate legacy churn/growth fields from new range fields
      const churnMidpoints: Record<string, number> = { '0-2': 1, '3-5': 4, '6-10': 8, '11-15': 13, '16+': 20 };
      const addedMidpoints: Record<string, number> = { '0-3': 1.5, '4-8': 6, '9-15': 12, '16-25': 20, '26+': 30 };
      const lostMid = churnMidpoints[intakeData.clientsLostAnnual] || 4;
      const addedMid = addedMidpoints[intakeData.clientsAddedAnnual] || 6;
      intakeData.clientsLostPerMonth = lostMid / 12;
      intakeData.clientsAddedPerMonth = addedMid / 12;
      intakeData.churnRevenueAnnual = lostMid * intakeData.avgClientValue * 12;
      intakeData.newRevenueAnnual = addedMid * intakeData.avgClientValue * 12;
      intakeData.avgClientLifetime = lostMid > 0 ? Math.round(intakeData.currentClients / (lostMid / 12)) : 24;
      intakeData.closeRate = typeof intakeData.closeRate === 'string'
        ? parseFloat(intakeData.closeRate.replace(/[^0-9.]/g, '') || '25')
        : intakeData.closeRate;

      const response = await fetch('/api/growthos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intakeData,
          userId: 'current'
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
    'Calculating revelations & generating insights'
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
            <span>Section {Math.min(Math.ceil(progress / 12.5) || 1, 8)} of 8</span>
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
          {/* Section 1: Agency Basics */}
          <FormSection number={1} title="Agency Basics">
            <TextField label="Agency Name" name="agencyName" required placeholder="Your agency name" value={formData.agencyName || ''} onChange={handleChange} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField label="Founder LinkedIn URL" name="founderLinkedinUrl" required type="url" placeholder="https://linkedin.com/in/you" helpText="We'll analyze your last 20 posts" value={formData.founderLinkedinUrl || ''} onChange={handleChange} />
              <TextField label="Company LinkedIn URL" name="companyLinkedinUrl" type="url" placeholder="https://linkedin.com/company/you" helpText="Optional" value={formData.companyLinkedinUrl || ''} onChange={handleChange} />
            </div>
            <NumberField label="Team Size (including founder)" name="teamSize" required min={1} placeholder="e.g., 8" value={formData.teamSize || ''} onChange={handleChange} />
          </FormSection>

          {/* Section 2: Revenue & Financials */}
          <FormSection number={2} title="Revenue & Financials">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumberField label="Last Year's Annual Revenue" name="lastYearRevenue" required placeholder="e.g., 1500000" prefix="$" value={formData.lastYearRevenue || ''} onChange={handleChange} />
              <NumberField label="This Year's Target Revenue" name="targetRevenue" required placeholder="e.g., 2000000" prefix="$" value={formData.targetRevenue || ''} onChange={handleChange} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField label="Net Profit Margin" name="netProfitMargin" required options={[
                { value: '<5%', label: 'Less than 5%' },
                { value: '5-10%', label: '5-10%' },
                { value: '10-15%', label: '10-15%' },
                { value: '15-20%', label: '15-20%' },
                { value: '20-25%', label: '20-25%' },
                { value: '25-30%', label: '25-30%' },
                { value: '30%+', label: '30%+' },
              ]} value={formData.netProfitMargin || ''} onChange={handleChange} />
              <NumberField label="Last Month's Revenue" name="lastMonthRevenue" required placeholder="e.g., 120000" prefix="$" helpText="Used to calculate avg client value" value={formData.lastMonthRevenue || ''} onChange={handleChange} />
            </div>
          </FormSection>

          {/* Section 3: Clients & Churn */}
          <FormSection number={3} title="Clients & Churn" note="Critical for diagnosis. Be as accurate as possible.">
            <NumberField label="Current Active Clients" name="currentClients" required min={0} placeholder="e.g., 25" value={formData.currentClients || ''} onChange={handleChange} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField label="Clients Lost (past 12 months)" name="clientsLostAnnual" required options={[
                { value: '0-2', label: '0-2 clients' },
                { value: '3-5', label: '3-5 clients' },
                { value: '6-10', label: '6-10 clients' },
                { value: '11-15', label: '11-15 clients' },
                { value: '16+', label: '16+ clients' },
              ]} value={formData.clientsLostAnnual || ''} onChange={handleChange} />
              <SelectField label="New Clients Added (past 12 months)" name="clientsAddedAnnual" required options={[
                { value: '0-3', label: '0-3 clients' },
                { value: '4-8', label: '4-8 clients' },
                { value: '9-15', label: '9-15 clients' },
                { value: '16-25', label: '16-25 clients' },
                { value: '26+', label: '26+ clients' },
              ]} value={formData.clientsAddedAnnual || ''} onChange={handleChange} />
            </div>

            {/* Churn calibration */}
            {churnEstimate && (
              <>
                <div className="bg-slate-700/30 border border-slate-600/50 rounded-xl p-4 my-4">
                  <p className="text-sm text-slate-300">
                    Based on your inputs, you&apos;re losing approximately{' '}
                    <strong className="text-white">${churnEstimate.monthlyChurn.toLocaleString()}/month</strong> to churn{' '}
                    (<strong className="text-white">{churnEstimate.churnRate}%</strong> of monthly revenue).
                    Does that feel right?
                  </p>
                </div>
                <SelectField label="Churn Calibration" name="churnCalibration" required options={[
                  { value: 'Lower', label: 'Lower — actual churn is less than that' },
                  { value: 'About Right', label: 'About Right' },
                  { value: 'Higher', label: 'Higher — actual churn is more than that' },
                ]} value={formData.churnCalibration || ''} onChange={handleChange} />
              </>
            )}
            {!churnEstimate && formData.currentClients && formData.clientsLostAnnual && (
              <SelectField label="Churn Calibration" name="churnCalibration" required options={[
                { value: 'Lower', label: 'Lower' },
                { value: 'About Right', label: 'About Right' },
                { value: 'Higher', label: 'Higher' },
              ]} value={formData.churnCalibration || ''} onChange={handleChange} />
            )}
          </FormSection>

          {/* Section 4: Lead Sources */}
          <FormSection number={4} title="Lead Sources" note="Channel percentages should total 100%">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <NumberField label="Referrals (%)" name="referralPercent" required min={0} max={100} placeholder="0" value={formData.referralPercent || ''} onChange={handleChange} />
              <NumberField label="Inbound/Website (%)" name="inboundPercent" required min={0} max={100} placeholder="0" value={formData.inboundPercent || ''} onChange={handleChange} />
              <NumberField label="Content/Social (%)" name="contentPercent" required min={0} max={100} placeholder="0" value={formData.contentPercent || ''} onChange={handleChange} />
              <NumberField label="Paid Ads (%)" name="paidPercent" required min={0} max={100} placeholder="0" value={formData.paidPercent || ''} onChange={handleChange} />
              <NumberField label="Outbound (%)" name="outboundPercent" required min={0} max={100} placeholder="0" value={formData.outboundPercent || ''} onChange={handleChange} />
              <NumberField label="Partnerships (%)" name="partnershipPercent" min={0} max={100} placeholder="0" helpText="Optional, default 0" value={formData.partnershipPercent || ''} onChange={handleChange} />
            </div>
            <div className={`text-xs mt-1 mb-3 ${Math.abs(leadSourceTotal - 100) <= 5 ? 'text-slate-500' : 'text-red-400'}`}>
              Total: {leadSourceTotal}% {Math.abs(leadSourceTotal - 100) > 5 && '(must be ~100%)'}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumberField label="Qualified Leads Per Month" name="monthlyLeads" required placeholder="e.g., 15" value={formData.monthlyLeads || ''} onChange={handleChange} />
              <SelectField label="Close Rate" name="closeRate" required options={[
                { value: '<10%', label: 'Less than 10%' },
                { value: '10-20%', label: '10-20%' },
                { value: '20-30%', label: '20-30%' },
                { value: '30-40%', label: '30-40%' },
                { value: '40-50%', label: '40-50%' },
                { value: '50%+', label: '50%+' },
              ]} value={formData.closeRate || ''} onChange={handleChange} />
            </div>
          </FormSection>

          {/* Section 5: Founder Time */}
          <FormSection number={5} title="Founder Time" note="How much do YOU personally handle in each area? 1 = I do almost everything, 5 = Fully delegated">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumberField label="Your Weekly Hours" name="founderWeeklyHours" required placeholder="e.g., 50" value={formData.founderWeeklyHours || ''} onChange={handleChange} />
              <NumberField label="Hours on Strategy/Growth" name="strategyHoursPerWeek" required min={0} placeholder="e.g., 10" helpText="Working ON vs IN the business" value={formData.strategyHoursPerWeek || ''} onChange={handleChange} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <RatingField label="Client Deliverables" name="ceoDeliveryRating" value={formData.ceoDeliveryRating || ''} onChange={handleChange} />
              <RatingField label="Account Management" name="ceoAccountMgmtRating" value={formData.ceoAccountMgmtRating || ''} onChange={handleChange} />
              <RatingField label="Marketing" name="ceoMarketingRating" value={formData.ceoMarketingRating || ''} onChange={handleChange} />
              <RatingField label="Sales & BD" name="ceoSalesRating" value={formData.ceoSalesRating || ''} onChange={handleChange} />
            </div>
          </FormSection>

          {/* Section 6: Systems & Documentation */}
          <FormSection number={6} title="Systems & Documentation">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField label="Sales Process Documented?" name="hasSalesSOP" required options={SOP_OPTIONS} value={formData.hasSalesSOP || ''} onChange={handleChange} />
              <SelectField label="Delivery Process Documented?" name="hasDeliverySOP" required options={SOP_OPTIONS} value={formData.hasDeliverySOP || ''} onChange={handleChange} />
              <SelectField label="Account Management Documented?" name="hasAccountMgmtSOP" required options={SOP_OPTIONS} value={formData.hasAccountMgmtSOP || ''} onChange={handleChange} />
              <SelectField label="Marketing Process Documented?" name="hasMarketingSOP" required options={SOP_OPTIONS} value={formData.hasMarketingSOP || ''} onChange={handleChange} />
            </div>
          </FormSection>

          {/* Section 7: Positioning & ICP */}
          <FormSection number={7} title="Positioning & ICP">
            <CheckboxField label="Target Client Company Size" name="targetCompanySize" required helpText="Select all that apply" options={[
              { value: '1-10', label: '1-10 employees' },
              { value: '11-50', label: '11-50 employees' },
              { value: '51-200', label: '51-200 employees' },
              { value: '201-1000', label: '201-1,000 employees' },
              { value: '1000+', label: '1,000+ employees' },
            ]} values={(formData.targetCompanySize || '').split(',').filter(Boolean)} onToggle={handleToggle} />
            <CheckboxField label="Target Client Industry" name="targetIndustry" required helpText="Select all that apply" options={INDUSTRY_OPTIONS} values={(formData.targetIndustry || '').split(',').filter(Boolean)} onToggle={handleToggle} />
            {(formData.targetIndustry || '').includes('Other') && (
              <TextField label="Specify Industry" name="targetIndustryOther" required placeholder="e.g., Crypto / Web3" value={formData.targetIndustryOther || ''} onChange={handleChange} />
            )}
            <TextAreaField label="Who is your ideal client?" name="statedICP" required placeholder="E.g., B2B SaaS companies with $5M-$20M ARR who need SEO and content" helpText="Be specific — 'everyone' is wrong." maxLength={500} value={formData.statedICP || ''} onChange={handleChange} />
            <TextAreaField label="What is your core offer?" name="coreOffer" required placeholder="E.g., Done-for-you SEO + content that drives qualified pipeline" helpText="Your main thing" maxLength={500} value={formData.coreOffer || ''} onChange={handleChange} />
            <TextAreaField label="What makes you different?" name="differentiator" required placeholder="E.g., We only work with Series A+ SaaS. Our playbook has generated $50M+ in pipeline." helpText="Your unique edge" maxLength={500} value={formData.differentiator || ''} onChange={handleChange} />
          </FormSection>

          {/* Section 8: Visibility & Proof */}
          <FormSection number={8} title="Visibility & Proof">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumberField label="Founder LinkedIn Posts/Week" name="founderPostsPerWeek" required min={0} placeholder="e.g., 3" value={formData.founderPostsPerWeek || ''} onChange={handleChange} />
              <NumberField label="Team LinkedIn Posts/Week" name="teamPostsPerWeek" min={0} placeholder="e.g., 5" helpText="Can be 0" value={formData.teamPostsPerWeek || ''} onChange={handleChange} />
            </div>
            <RadioField label="Published Case Studies?" name="hasCaseStudies" required options={[
              { value: 'Yes (3+)', label: 'Yes (3+)' },
              { value: 'Some (1-2)', label: 'Some (1-2)' },
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
