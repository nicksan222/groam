import { RecordListBadge } from '@groam/ui/components/record-list-badge';
import { cn } from '@groam/ui/lib/utils';
import { Check, CircleDashed, Plus } from 'lucide-react';
import { testIds } from '@/lib/test-ids';
import type { PackingCoverage } from '@/types/packing';
import { PackingCount } from './packing-count';
import { useChanged } from './use-packing-motion';

const stateIcon = { covered: Check, missing: CircleDashed, over: Plus } as const;

/**
 * One quiet status and count, with the same badge treatment as other record lists.
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
    <RecordListBadge
      className={cn('max-w-full gap-1.5 whitespace-nowrap', changed && 'packing-fade-in')}
      data-changed={changed ? 'true' : undefined}
      data-state={coverage.state}
      data-testid={testIds.tripPackingCoverage}
    >
      <Icon
        aria-hidden
        className={cn(
          'size-3.5 shrink-0',
          changed && coverage.state === 'covered' && 'packing-check-pop'
        )}
      />
      <span className="sr-only @md/record:not-sr-only">{coverage.label}</span>
      <span aria-hidden className="hidden @md/record:inline">
        ·
      </span>
      <span>
        <PackingCount>{item.brought}</PackingCount> of <PackingCount>{item.quantity}</PackingCount>{' '}
        <span className="sr-only @md/record:not-sr-only">claimed</span>
      </span>
    </RecordListBadge>
  );
}
