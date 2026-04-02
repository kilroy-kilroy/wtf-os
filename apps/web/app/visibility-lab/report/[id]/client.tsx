'use client';

import { Dashboard } from '@/components/visibility-lab/Dashboard';
import { ProReport } from '@/components/visibility-lab-pro/ProReport';
import type { AnalysisReport } from '@/lib/visibility-lab/types';
import type { VisibilityLabProReport } from '@/lib/visibility-lab-pro/types';

interface Props {
  report: Record<string, unknown>;
  isPro: boolean;
}

export function VisibilityReportClient({ report, isPro }: Props) {
  if (isPro) {
    return <ProReport data={report as unknown as VisibilityLabProReport} onReset={() => {}} />;
  }
  return <Dashboard data={report as unknown as AnalysisReport} onReset={() => {}} />;
}
