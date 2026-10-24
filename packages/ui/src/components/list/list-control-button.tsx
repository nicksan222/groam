import type { Icon } from '@groam/icons';
import { Button, type ButtonProps } from '@groam/ui/components/button';
import { Kbd } from '@groam/ui/components/kbd';

/** One look and touch target for list dialog openers, in either theme. */
export function ListControlButton({
  icon: Icon,
  label,
  shortcut,
  ...props
}: Omit<ButtonProps, 'children' | 'className' | 'size' | 'variant'> & {
  icon: Icon;
  label: string;
  shortcut?: string;
}) {
  return (
    <Button
      aria-haspopup="dialog"
      className="gap-2 max-md:h-11"
      size="sm"
      variant="outline"
      {...props}
    >
      <Icon aria-hidden className="size-4 text-foreground" />
      {label}
      {shortcut ? (
        <Kbd aria-hidden className="ml-1 text-foreground">
          {shortcut}
        </Kbd>
      ) : null}
    </Button>
  );
}
