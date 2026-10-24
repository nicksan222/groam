import { cn } from '@groam/ui/lib/utils';
import type { ReactNode } from 'react';
import type { PlanKind } from '@/types/trip-planner';
import { PlanKindProvider } from './plan-kind-context';
import { planKindLook } from './plan-kind-look';

/** The surface of a plan card, washed in its kind's hue; its parts read the kind from it. */
export function PlanCard({
  children,
  id,
  kind
}: {
  children: ReactNode;
  id?: string;
  kind: PlanKind;
}) {
  return (
    <PlanKindProvider value={kind}>
      <div
        className={cn(
          'group/entry min-w-0 rounded-md p-3 ring-1 ring-inset',
          planKindLook[kind].surface
        )}
        id={id}
      >
        {children}
      </div>
    </PlanKindProvider>
  );
}
