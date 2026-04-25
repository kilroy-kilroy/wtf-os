'use client';

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="font-anton text-sm uppercase border border-[#E51B23] text-[#E51B23] px-4 py-2 rounded hover:bg-[#E51B23] hover:text-white transition"
    >
      SAVE AS PDF
    </button>
  );
}
