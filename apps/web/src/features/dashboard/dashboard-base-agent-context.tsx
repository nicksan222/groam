import { useSetAgentContext } from '@groam/ai/ui/context/agent-context';
import { buildDashboardContext } from '@/features/dashboard/hooks/dashboard-agent-context';
import type { DashboardBuckets } from '@/features/dashboard/hooks/dashboard-model';

/** Fallback when an activity source fails: the context without the activity data. */
export function DashboardBaseAgentContext({
  buckets,
  groupName
}: {
  buckets: DashboardBuckets;
  groupName: string;
}) {
  useSetAgentContext(buildDashboardContext({ buckets, groupName }));
  return null;
}
