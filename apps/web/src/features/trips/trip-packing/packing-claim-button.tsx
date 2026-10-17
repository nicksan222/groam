import { Button } from '@groam/ui/components/button';
import { Spinner } from '@groam/ui/components/spinner';
import { cn } from '@groam/ui/lib/utils';
import { Plus } from 'lucide-react';
import type { PackingCoverage } from '@/types/packing';

/**
 * "I'll bring one", the same control on the shared row and in an idea's editor: outlined and
 * labelled while the item still needs gear, a quiet icon on narrow screens once it is covered.
 */
export function PackingClaimButton({
  coverageState,
  disabled = false,
  itemLabel,
  more = false,
  onClick,
  pending = false,
  testId
}: {
  coverageState: PackingCoverage['state'];
  disabled?: boolean;
  itemLabel: string;
  /** The viewer already brings this item, so the action adds one more. */
  more?: boolean;
  onClick: () => void;
  pending?: boolean;
  testId: string;
}) {
  const missing = coverageState === 'missing';
  return (
    <Button
      aria-busy={pending || undefined}
      aria-label={`${more ? 'Bring one more' : "I'll bring one"} ${itemLabel}`}
      className={cn(
        'pointer-coarse:h-9 sm:w-32',
        !missing && 'max-sm:w-8 max-sm:px-0 pointer-coarse:max-sm:w-9'
      )}
      data-testid={testId}
      disabled={disabled || pending}
      onClick={onClick}
      size="xs"
      type="button"
      variant={missing ? 'outline' : 'ghost'}
    >
      {pending ? <Spinner aria-hidden className="size-3.5" role="presentation" /> : <Plus />}
      <span className={missing ? undefined : 'max-sm:sr-only'}>
        {more ? 'Bring one more' : "I'll bring one"}
      </span>
    </Button>
  );
}
