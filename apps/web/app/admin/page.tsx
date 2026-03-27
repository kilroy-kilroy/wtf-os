// apps/web/app/admin/page.tsx
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
    </div>
  );
}
