import type { Icon } from '@groam/icons';
import { IconTile } from '@groam/ui/components/icon-tile';
import { usePlanKind } from './plan-kind-context';
import { planKindLook } from './plan-kind-look';

/** The tinted square that opens a plan card and says what it is at a glance. */
export function PlanCardTile({ icon: TileIcon }: { icon: Icon }) {
  return (
    <IconTile className={planKindLook[usePlanKind()].tile} radius="md" size="sm" variant="plain">
      <TileIcon aria-hidden="true" className="size-4" />
    </IconTile>
  );
}
