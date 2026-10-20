import { cn } from '@groam/ui/lib/utils';
import { Check, CircleDashed, Plus } from 'lucide-react';
import { testIds } from '@/lib/test-ids';
import type { PackingCoverage } from '@/types/packing';
import { PackingCount } from './packing-count';
import { useChanged } from './use-packing-motion';

const stateStyle = {
  covered: 'text-muted-foreground',
  missing: 'text-warning-foreground',
  over: 'text-muted-foreground'
} as const;

const stateIcon = { covered: Check, missing: CircleDashed, over: Plus } as const;

/**
 * One compact coverage column: the decision first, the claimed quantity underneath.
 * The section summary carries progress, so individual rows do not repeat it as mini charts.
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
      className="inline-flex shrink-0 flex-col gap-1 text-xs @lg/gear:w-28 @lg/gear:items-end"
      data-state={coverage.state}
      data-testid={testIds.tripPackingCoverage}
    >
      <span
        className={cn(
          'inline-flex items-center gap-1.5 font-medium whitespace-nowrap',
          stateStyle[coverage.state],
          changed && 'packing-fade-in'
        )}
        data-changed={changed ? 'true' : undefined}
        key={coverage.state}
      >
        <Icon
          aria-hidden
          className={cn(
            'size-3.5 shrink-0',
            changed && coverage.state === 'covered' && 'packing-check-pop'
          )}
        />
        {coverage.label}
      </span>
      <span className="whitespace-nowrap text-muted-foreground">
        <PackingCount>{item.brought}</PackingCount> of <PackingCount>{item.quantity}</PackingCount>{' '}
        claimed
      </span>
    </span>
  );
}
