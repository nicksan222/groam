import { cn } from '@groam/ui/lib/utils';
import { Check, CircleAlert, Plus } from 'lucide-react';
import { testIds } from '@/lib/test-ids';
import type { PackingCoverage } from '@/types/packing';
import { PackingCount } from './packing-count';
import { PackingProgress } from './packing-progress';
import { useChanged } from './use-packing-motion';

const stateStyle = {
  covered: 'bg-success/10 text-success-foreground',
  missing: 'bg-warning/10 text-warning-foreground',
  over: 'bg-info/10 text-info-foreground'
} as const;

const stateIcon = { covered: Check, missing: CircleAlert, over: Plus } as const;

/**
 * Coverage as two aligned cells: the count ("3 of 3 claimed") as quiet tabular text, then the
 * state pill ("Covered", "Need 2 more", "1 spare"). Fixed cell widths keep rows in column.
 */
export function PackingCoverageBadge({
  coverage,
  item
}: {
  coverage: PackingCoverage;
  item: { brought: number; quantity: number };
}) {
  const Icon = stateIcon[coverage.state];
  const changed = useChanged(coverage.state);
  return (
    <span
      className="inline-flex shrink-0 items-center gap-2"
      data-state={coverage.state}
      data-testid={testIds.tripPackingCoverage}
    >
      <span className="flex min-w-24 flex-col gap-1 text-xs text-muted-foreground sm:w-28 sm:text-end">
        <span>
          <PackingCount>{item.brought}</PackingCount> of{' '}
          <PackingCount>{item.quantity}</PackingCount> claimed
        </span>
        <PackingProgress state={coverage.state} total={item.quantity} value={item.brought} />
      </span>
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap sm:w-28',
          stateStyle[coverage.state],
          changed && 'packing-fade-in'
        )}
        data-changed={changed ? 'true' : undefined}
        key={coverage.state}
      >
        <Icon
          aria-hidden
          className={cn(
            'size-3 shrink-0',
            changed && coverage.state === 'covered' && 'packing-check-pop'
          )}
        />
        <span className="truncate">{coverage.label}</span>
      </span>
    </span>
  );
}
