import { Plus } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import type { PackingCoverage } from '@/types/packing';

/**
 * "I'll bring one", the same control on the shared row and in an idea's editor: the primary
 * action while the item still needs gear, quiet once it is covered. Keep the same footprint and label at every state.
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
      aria-label={`${more ? 'Bring one more' : "I'll bring one"} ${itemLabel}`}
      className="w-9 shrink-0 px-0 pointer-coarse:h-9 @sm/gear:w-24 @sm/gear:px-2 @md/gear:w-32"
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      pending={pending}
      size="xs"
      type="button"
      variant={missing ? 'default' : 'ghost'}
    >
      <Plus />
      <span className="sr-only @sm/gear:not-sr-only @md/gear:hidden">
        {more ? 'Bring more' : 'Bring one'}
      </span>
      <span className="hidden @md/gear:inline">{more ? 'Bring one more' : "I'll bring one"}</span>
    </Button>
  );
}
