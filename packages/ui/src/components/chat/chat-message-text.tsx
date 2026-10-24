import { cn } from '@groam/ui/lib/utils';
import type { ComponentProps, ReactElement } from 'react';

export type ChatMessageTextProps = Omit<ComponentProps<'p'>, 'children'> & {
  text: string;
  mentions?: readonly string[];
};

export function ChatMessageText({
  text,
  mentions = [],
  className,
  ...props
}: ChatMessageTextProps): ReactElement {
  const names = new Set(mentions.map((name) => `@${name}`));
  let offset = 0;
  const parts = text.split(/(@[\p{L}\p{N}_.-]+)/u).map((part) => {
    const segment = { part, offset };
    offset += part.length;
    return segment;
  });
  return (
    <p
      className={cn('m-0 whitespace-pre-wrap break-words text-sm leading-[1.55]', className)}
      {...props}
    >
      {parts.map(({ part, offset }, index) => {
        if (index > 0 && !/(?:^|\s)$/.test(parts[index - 1]?.part ?? '')) return part;
        const mention = names.has(part) ? part : part.replace(/[.-]+$/, '');
        if (!names.has(mention)) return part;
        return (
          <span key={offset}>
            <span className="font-medium">{mention}</span>
            {part.slice(mention.length)}
          </span>
        );
      })}
    </p>
  );
}
