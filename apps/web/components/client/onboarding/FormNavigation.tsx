'use client';

interface FormNavigationProps {
  onBack?: () => void;
  nextLabel?: string;
  showBack?: boolean;
  nextDisabled?: boolean;
}

export default function FormNavigation({
  onBack,
  nextLabel = 'Next',
  showBack = true,
  nextDisabled = false,
}: FormNavigationProps) {
  return (
    <div className="flex justify-between mt-8 pt-6 border-t border-[#333333]">
      {showBack ? (
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-2 text-sm font-medium text-[#999999] bg-[#1A1A1A] border border-[#333333] hover:border-[#666666] hover:text-white transition-colors"
        >
          Back
        </button>
      ) : (
        <div />
      )}

      <button
        type="submit"
        disabled={nextDisabled}
        className="px-6 py-2 text-sm font-bold text-white bg-[#E51B23] hover:bg-[#FFDE59] hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed font-anton tracking-wider uppercase"
      >
        {nextLabel}
      </button>
    </div>
  );
}
