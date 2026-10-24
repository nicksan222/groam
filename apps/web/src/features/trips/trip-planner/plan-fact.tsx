import type { Icon } from '@groam/icons';
import { cn } from '@groam/ui/lib/utils';
import type { ReactNode } from 'react';
import { usePlanKind } from './plan-kind-context';
import { planKindLook } from './plan-kind-look';

const factClass =
  'inline-flex h-6 min-w-0 max-w-full items-center gap-2 rounded-md bg-foreground/5 px-2 text-xs text-muted-foreground tabular-nums';

/** One fact under a plan card's notes, its icon in the card's hue; a link when it has somewhere to go. */
export function PlanFact({
  children,
  href,
  icon: FactIcon
}: {
  children: ReactNode;
  href?: string;
  icon: Icon;
}) {
  const content = (
    <>
      <FactIcon
        aria-hidden="true"
        className={cn('size-3 shrink-0', planKindLook[usePlanKind()].text)}
      />
      <span className="truncate">{children}</span>
    </>
  );
  if (!href) return <span className={factClass}>{content}</span>;
  return (
    <a
      className={cn(
        factClass,
        'outline-none transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring'
      )}
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {content}
    </a>
  );
}
