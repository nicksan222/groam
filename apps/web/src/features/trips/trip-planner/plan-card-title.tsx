import { cn } from '@groam/ui/lib/utils';
import { Fragment } from 'react';
import { usePlanKind } from './plan-kind-context';
import { planKindLook } from './plan-kind-look';

/** The title, then the kind's word in its hue followed by what else to know, after dots. */
export function PlanCardTitle({
  label,
  meta,
  title
}: {
  label: string;
  meta: string[];
  title: string;
}) {
  return (
    <div className="min-w-0 flex-1">
      <p className="break-words text-sm font-medium leading-5">{title}</p>
      <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
        <span className={cn('font-medium', planKindLook[usePlanKind()].text)}>{label}</span>
        {meta.map((part) => (
          <Fragment key={part}>
            <span aria-hidden="true">·</span>
            <span className="min-w-0 break-words">{part}</span>
          </Fragment>
        ))}
      </p>
    </div>
  );
}
