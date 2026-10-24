import { ChevronDown, ChevronRight } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { type ReactNode, useId } from 'react';

/**
 * A run of rows under an optional header bar: label (an h2), count, an optional trailing `action`.
 * Pass `onToggle` to make the header a button that folds the rows (`collapsed`). With no `label`
 * the rows render bare; give them an `aria-label` then. Rows always live in a group, which is
 * their accessible list.
 */
function ListGroup({
  'aria-label': ariaLabel,
  action,
  children,
  collapsed = false,
  count,
  label,
  onToggle
}: {
  'aria-label'?: string;
  action?: ReactNode;
  children: ReactNode;
  collapsed?: boolean;
  count?: number;
  label?: string | null;
  onToggle?: () => void;
}) {
  const headingId = useId();
  const rows = collapsed ? null : (
    <ul
      aria-label={label ? undefined : ariaLabel}
      aria-labelledby={label ? headingId : undefined}
      className="m-0 list-none p-0"
    >
      {children}
    </ul>
  );
  if (!label) return <div data-slot="list-group">{rows}</div>;
  const Chevron = collapsed ? ChevronRight : ChevronDown;
  const text = (
    <>
      {onToggle ? <Chevron aria-hidden className="size-4 shrink-0" /> : null}
      <span>
        <span className="font-semibold text-foreground">{label}</span>
        {count === undefined ? null : <> · {count}</>}
      </span>
    </>
  );
  return (
    <div data-slot="list-group">
      <div className="flex h-9 items-center border-b border-border bg-secondary text-[12.5px] font-medium text-muted-foreground">
        <h2 className="m-0 min-w-0 flex-1 text-[12.5px] font-medium" id={headingId}>
          {onToggle ? (
            <Button
              aria-expanded={!collapsed}
              className="flex h-9 w-full min-w-0 cursor-pointer items-center gap-2 px-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:px-6"
              onClick={onToggle}
              type="button"
              unstyled
            >
              {text}
            </Button>
          ) : (
            <span className="flex h-9 items-center gap-2 px-4 md:px-6">{text}</span>
          )}
        </h2>
        {action ? <div className="pr-4 md:pr-6">{action}</div> : null}
      </div>
      {rows}
    </div>
  );
}

export { ListGroup };
