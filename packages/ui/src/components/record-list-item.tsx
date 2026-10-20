import { cn } from '@groam/ui/lib/utils';
import type { ComponentProps, ReactNode } from 'react';

function recordLayout(layout: 'stacked' | 'inline') {
  if (layout === 'stacked') return {};
  return {
    content: '@xl/record:flex @xl/record:items-center @xl/record:gap-6',
    title: 'text-sm font-medium @xl/record:flex-1',
    context:
      'grid-cols-[auto_minmax(0,1fr)_auto] @xl/record:mt-0 @xl/record:w-[26rem] @xl/record:max-w-[65%] @xl/record:shrink-0 @xl/record:gap-3',
    metadata: 'col-start-1 row-start-1',
    description: 'col-span-1 col-start-2',
    badges: 'col-start-3 row-start-1'
  };
}

/** Compact desktop records adapt into title, preview and a touch-friendly footer on phones. */
export function RecordListItem({
  className,
  children,
  badges,
  description,
  icon,
  layout = 'stacked',
  metadata,
  title,
  wrapTitle = false,
  trailing,
  ...props
}: Omit<ComponentProps<'article'>, 'title'> & {
  badges?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  /** Inline records keep their title and context together when the container has room. */
  layout?: 'stacked' | 'inline';
  metadata?: ReactNode;
  title: ReactNode;
  wrapTitle?: boolean;
  trailing?: ReactNode;
}) {
  const arrangement = recordLayout(layout);
  return (
    <article
      className={cn(
        'group/record @container/record relative min-w-0 bg-transparent px-4 py-4 transition-colors hover:bg-foreground/[0.03] focus-within:bg-foreground/[0.03] @md/record:px-5',
        className
      )}
      data-slot="record-list-item"
      {...props}
    >
      <div className="grid min-w-0 grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2 @md/record:flex @md/record:gap-3">
        {icon ? (
          <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg [&>svg]:size-4">
            {icon}
          </div>
        ) : null}
        <div
          className={cn(
            'contents @md/record:block @md/record:min-w-0 @md/record:flex-1',
            arrangement.content
          )}
        >
          <div
            className={cn(
              'min-w-0 text-base leading-5 font-semibold text-foreground @md/record:leading-6 [&>h4]:min-w-0',
              wrapTitle
                ? 'whitespace-normal wrap-anywhere'
                : 'h-10 overflow-hidden @md/record:h-6 @md/record:truncate',
              icon ? 'col-start-2' : 'col-span-2',
              arrangement.title
            )}
            data-slot="record-list-title"
          >
            {title}
          </div>
          <div
            className={cn(
              'col-span-2 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 @md/record:mt-2 @md/record:flex @md/record:h-6',
              !description && 'min-h-11 @md/record:min-h-0',
              arrangement.context
            )}
            data-slot="record-list-context"
          >
            {metadata ? (
              <div
                className={cn(
                  'flex h-11 min-w-0 items-center gap-2 overflow-hidden text-xs leading-5 text-muted-foreground @md/record:h-6',
                  description
                    ? 'row-start-2 @md/record:max-w-[50%] @md/record:shrink-0'
                    : '@md/record:flex-1',
                  arrangement.metadata
                )}
                data-slot="record-list-metadata"
              >
                {metadata}
              </div>
            ) : null}
            {description ? (
              <div
                className={cn(
                  'col-span-2 row-start-1 min-h-5 min-w-0 truncate text-sm leading-5 text-muted-foreground @md/record:flex-1 @md/record:text-xs',
                  arrangement.description
                )}
                data-slot="record-list-description"
              >
                {description}
              </div>
            ) : null}
            {!metadata && description ? (
              <div aria-hidden className="row-start-2 h-11 @md/record:hidden" />
            ) : null}
            {badges ? (
              <div
                className={cn(
                  'relative z-10 col-start-2 flex h-11 shrink-0 items-center gap-1.5 @max-md/record:[&_button]:min-h-11 @max-md/record:[&_button]:min-w-11 @md/record:h-6',
                  description && 'row-start-2',
                  arrangement.badges
                )}
                data-slot="record-list-badges"
              >
                {badges}
              </div>
            ) : null}
          </div>
        </div>
        {trailing ? (
          <div
            className="relative z-10 hidden shrink-0 items-center gap-4 self-center text-xs leading-5 text-muted-foreground @md/record:flex"
            data-slot="record-list-trailing"
          >
            {trailing}
          </div>
        ) : null}
      </div>
      {children}
    </article>
  );
}
