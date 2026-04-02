// apps/web/app/admin/page.tsx
import Link from 'next/link';
import { getAdminDashboardData } from '@/lib/admin/get-admin-dashboard-data';
import { ActionQueue } from '@/components/admin/ActionQueue';
import { ClientCards } from '@/components/admin/ClientCards';
import { PlatformPulse } from '@/components/admin/PlatformPulse';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
      {/* Zone 1: Action Queue */}
      <section>
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
          Needs Your Attention
        </h2>
        <ActionQueue items={data.actionItems} />
      </section>

      {/* Zone 2: Client Cards */}
      <section>
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
          Coaching Clients
        </h2>
        <ClientCards cards={data.clientCards} />
      </section>

      {/* Zone 3: Platform Pulse */}
      <section>
        <PlatformPulse pulse={data.pulse} />
      </section>

      {/* Zone 4: Admin Tools */}
      <section>
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
          Admin Tools
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/admin/users"
            className="border border-slate-700/50 rounded-lg p-6 hover:border-slate-600 transition-colors group"
          >
            <h3 className="text-white font-medium mb-2 group-hover:text-[#00D4FF] transition-colors">
              User Directory
            </h3>
            <p className="text-sm text-slate-400">Manage all system users and their profiles</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
