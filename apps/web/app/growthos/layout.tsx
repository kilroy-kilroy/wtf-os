import Link from 'next/link';

export const metadata = {
  title: 'GrowthOS - Business Diagnostic',
  description: 'Find what\'s broken in your business. Get a data-driven diagnostic with actionable insights.',
};

export default function GrowthOSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/growthos" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: 'linear-gradient(135deg, #00D4FF, #E31B23)' }}>
              G
            </div>
            <span className="text-xl font-extrabold bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(to right, #00D4FF, #E31B23)' }}>
              GrowthOS
            </span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main>{children}</main>
    </div>
  );
}
