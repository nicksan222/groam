import { ArrowDown, ArrowUp, CornerDownLeft, type Icon } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { Kbd } from '@groam/ui/components/kbd';
import { cn } from '@groam/ui/lib/utils';

export type ListHint = {
  /** Space-separated keys, each in its own key cap: `'J K'`. `↑`, `↓`, and `↵` draw as icons. */
  keys: string;
  label: string;
  /** Makes the hint a button that does what the key does; it then looks pressable. */
  onClick?: () => void;
};

const keyIcons: Record<string, { icon: Icon; name: string }> = {
  '↑': { icon: ArrowUp, name: 'Up' },
  '↓': { icon: ArrowDown, name: 'Down' },
  '↵': { icon: CornerDownLeft, name: 'Enter' }
};

function KeyCaps({ className, keys }: { className?: string; keys: string }) {
  return keys.split(' ').map((key) => {
    const found = keyIcons[key];
    return found ? (
      <Kbd aria-label={found.name} className={className} key={key}>
        <found.icon />
      </Kbd>
    ) : (
      <Kbd className={className} key={key}>
        {key}
      </Kbd>
    );
  });
}

/**
 * Key hints for a `List.Footer`: `<List.Hints hints={[{ keys: 'J K', label: 'move' }]} />`. A hint
 * with `onClick` is a small outlined button with a borderless key cap, and the clickable ones gather at the right edge;
 * plain hints stay flat text.
 */
function ListHints({
  desktopOnly = false,
  hints
}: {
  desktopOnly?: boolean;
  hints: readonly ListHint[];
}) {
  const firstClickable = hints.findIndex((hint) => hint.onClick);
  const content = (
    <>
      {hints.map(({ keys, label, onClick }, index) =>
        onClick ? (
          <Button
            className={cn(
              'inline-flex h-6 cursor-pointer items-center gap-1 rounded-md border border-input bg-background pr-2 pl-1 text-xs text-foreground/80 shadow-xs transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
              index === firstClickable && 'ml-auto'
            )}
            data-slot="list-hint"
            key={label}
            onClick={onClick}
            unstyled
          >
            <KeyCaps className="h-4 border-0 bg-muted" keys={keys} />
            {label}
          </Button>
        ) : (
          <span className="inline-flex items-center gap-2" data-slot="list-hint" key={label}>
            <KeyCaps keys={keys} />
            {label}
          </span>
        )
      )}
    </>
  );
  return desktopOnly ? <div className="hidden items-center gap-4 lg:flex">{content}</div> : content;
}

export { ListHints };
