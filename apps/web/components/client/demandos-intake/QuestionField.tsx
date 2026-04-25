// apps/web/components/client/demandos-intake/QuestionField.tsx
'use client';

import type { Question } from '@/lib/demandos-intake/questions';
import DocumentUploadSlot, { type ExistingDoc } from '@/components/client/DocumentUploadSlot';

type Props = {
  question: Question;
  value: unknown;
  onChange: (value: unknown) => void;
  onBlur?: () => void;
  readOnly?: boolean;
  documents?: ExistingDoc[];
  onDocumentsChange?: (docs: ExistingDoc[]) => void;
};

const inputClass =
  'w-full bg-black border border-[#333333] text-white px-4 py-3 focus:border-[#E51B23] focus:outline-none text-sm';

export default function QuestionField({
  question, value, onChange, onBlur, readOnly, documents, onDocumentsChange,
}: Props) {
  const { type, label, help, options, placeholder } = question;

  if (type === 'upload') {
    return (
      <DocumentUploadSlot
        category={question.uploadCategory!}
        label={label}
        helpText={help}
        existing={documents ?? []}
        readOnly={readOnly}
        onChange={onDocumentsChange}
      />
    );
  }

  const fieldLabel = (
    <>
      <label className="block text-sm text-gray-300 mb-1">
        {label}
        {question.required && <span className="text-[#E51B23] ml-1">*</span>}
      </label>
      {help && <p className="text-xs text-gray-500 mb-2">{help}</p>}
    </>
  );

  if (readOnly) {
    const display = (() => {
      if (Array.isArray(value)) return value.join(', ');
      if (value === undefined || value === null || value === '') return <span className="text-gray-600">—</span>;
      return String(value);
    })();
    return (
      <div>
        {fieldLabel}
        <div className="text-sm text-gray-200 whitespace-pre-wrap">{display}</div>
      </div>
    );
  }

  if (type === 'short-text' || type === 'url') {
    return (
      <div>
        {fieldLabel}
        <input
          type={type === 'url' ? 'url' : 'text'}
          className={inputClass}
          value={typeof value === 'string' ? value : ''}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
      </div>
    );
  }

  if (type === 'long-text') {
    return (
      <div>
        {fieldLabel}
        <textarea
          className={inputClass}
          rows={4}
          value={typeof value === 'string' ? value : ''}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
      </div>
    );
  }

  if (type === 'number') {
    return (
      <div>
        {fieldLabel}
        <input
          type="number"
          className={inputClass}
          value={typeof value === 'number' ? value : typeof value === 'string' ? value : ''}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          onBlur={onBlur}
        />
      </div>
    );
  }

  if (type === 'single-select') {
    return (
      <div>
        {fieldLabel}
        <select
          className={inputClass}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => { onChange(e.target.value); onBlur?.(); }}
        >
          <option value="">— choose —</option>
          {(options ?? []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
    );
  }

  if (type === 'multi-select') {
    const current = Array.isArray(value) ? (value as string[]) : [];
    const toggle = (opt: string) => {
      const next = current.includes(opt) ? current.filter((o) => o !== opt) : [...current, opt];
      onChange(next);
      onBlur?.();
    };
    return (
      <div>
        {fieldLabel}
        <div className="flex flex-wrap gap-2">
          {(options ?? []).map((opt) => {
            const on = current.includes(opt);
            return (
              <button
                type="button"
                key={opt}
                onClick={() => toggle(opt)}
                className={`px-3 py-1.5 border text-xs uppercase tracking-wider transition-colors ${
                  on
                    ? 'border-[#E51B23] bg-[#E51B23]/20 text-white'
                    : 'border-[#333333] bg-black text-gray-400 hover:text-white'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}
