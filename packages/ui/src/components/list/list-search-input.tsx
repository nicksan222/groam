import { Input } from '@groam/ui/components/input';
import { COMMAND_INPUT_CLASS_NAME } from '@groam/ui/lib/command-surface';
import { cn } from '@groam/ui/lib/utils';
import { type ComponentProps, type SyntheticEvent, useLayoutEffect, useMemo, useRef } from 'react';
import { segmentListSearch } from './list-search-query';
import { ListSearchToken } from './list-search-token';

/**
 * The filter's text field with Datadog-style tokens: the input's own text is transparent (the caret
 * and selection still draw) and a mirror behind it paints the same string in the same font, size,
 * and padding, colouring each recognised `key:value` word. The mirror only changes colour and
 * background (never weight or spacing) so its glyphs sit exactly under the input's, and it follows
 * the input's horizontal scroll.
 */
export function ListSearchInput({
  className,
  keys,
  onKeyUp,
  onScroll,
  onSelect,
  value,
  ...props
}: Omit<ComponentProps<typeof Input>, 'value'> & { keys: readonly string[]; value: string }) {
  const field = useRef<HTMLInputElement>(null);
  const track = useRef<HTMLSpanElement>(null);
  const segments = useMemo(() => segmentListSearch(value, keys), [keys, value]);
  const follow = () => {
    if (track.current && field.current) {
      track.current.style.transform = `translateX(${-field.current.scrollLeft}px)`;
    }
  };
  const followAfter = (handler?: (event: never) => void) => (event: SyntheticEvent) => {
    handler?.(event as never);
    follow();
  };
  useLayoutEffect(follow, [value]);

  return (
    <div className="relative min-w-0 flex-1" data-slot="list-search-field">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center overflow-hidden text-base whitespace-pre text-foreground md:text-[15px]"
        data-slot="list-search-mirror"
      >
        <span ref={track}>
          {segments.map((segment, index) => (
            <ListSearchToken key={`${index}:${segment.raw}`} segment={segment} />
          ))}
        </span>
      </div>
      <Input
        className={cn(COMMAND_INPUT_CLASS_NAME, 'text-transparent caret-foreground', className)}
        onKeyUp={followAfter(onKeyUp)}
        onScroll={followAfter(onScroll)}
        onSelect={followAfter(onSelect)}
        ref={field}
        value={value}
        {...props}
      />
    </div>
  );
}
