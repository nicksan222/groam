import { Button } from '@groam/ui/components/button';
import { cn } from '@groam/ui/lib/utils';
import { useEffect, useRef } from 'react';

/**
 * A phone's lane tabs: a sticky row of pills, one per lane, each with its count. The pill of the
 * lane on screen is filled and kept in sight; tapping one shows that lane.
 */
export function KanbanLaneTabs<Lane extends string>({
  className,
  lane,
  lanes,
  onChange,
  testId
}: {
  className?: string;
  lane: Lane;
  lanes: ReadonlyArray<{ count: number | string; key: Lane; title: string }>;
  onChange: (lane: Lane) => void;
  testId?: string;
}) {
  const row = useRef<HTMLElement>(null);
  useEffect(() => {
    const tab = row.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    row.current?.scrollTo({
      left: tab ? tab.offsetLeft - (row.current.clientWidth - tab.offsetWidth) / 2 : 0
    });
  }, [lane]);
  return (
    <nav
      aria-label="Lanes"
      className={cn(
        'sticky top-0 z-10 flex shrink-0 gap-2 overflow-auto bg-background py-2',
        className
      )}
      ref={row}
    >
      {lanes.map(({ count, key, title }) => (
        <Button
          aria-pressed={lane === key}
          className="group/tab shrink-0 gap-1 rounded-full border border-transparent aria-pressed:border-border aria-pressed:font-semibold"
          data-lane-tab={key}
          data-testid={testId}
          key={key}
          onClick={() => onChange(key)}
          size="sm"
          variant={lane === key ? 'secondary' : 'ghost'}
        >
          {title}{' '}
          <span className="text-muted-foreground tabular-nums group-aria-pressed/tab:text-foreground/70">
            {count}
          </span>
        </Button>
      ))}
    </nav>
  );
}
