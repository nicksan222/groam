import { Plus } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { Spinner } from '@groam/ui/components/spinner';
import type { PackingCoverage } from '@/types/packing';

/**
 * "I'll bring one", the same control on the shared row and in an idea's editor: outlined and
 * labelled while the item still needs gear. Keep the same footprint and label at every state.
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
      className="w-24 shrink-0 pointer-coarse:h-9 @md/record:w-32"
      data-testid={testId}
      disabled={disabled || pending}
      onClick={onClick}
      size="xs"
      type="button"
      variant={missing ? 'outline' : 'ghost'}
    >
      {pending ? <Spinner aria-hidden className="size-3.5" role="presentation" /> : <Plus />}
      <span className="@md/record:hidden">{more ? 'Bring more' : 'Bring one'}</span>
      <span className="hidden @md/record:inline">{more ? 'Bring one more' : "I'll bring one"}</span>
    </Button>
  );
}
