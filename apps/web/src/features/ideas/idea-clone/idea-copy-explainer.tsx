import { cn } from '@groam/ui/lib/utils';
import { ArrowRight, Lock, Pencil } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  ideaCopyExplainerAction,
  ideaCopyExplainerCopyCaption,
  ideaCopyExplainerCopyLabel,
  ideaCopyExplainerOriginalCaption,
  ideaCopyExplainerOriginalLabel
} from '@/features/ideas/idea-list/idea-page-copy';

export function IdeaCopyExplainer({
  className,
  originalName
}: {
  className?: string;
  originalName?: string;
}) {
  return (
    <section
      aria-label="How an idea works"
      className={cn('grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3', className)}
    >
      <CopySheet
        caption={ideaCopyExplainerOriginalCaption}
        icon={<Lock className="size-3.5" />}
        layered
        title={originalName ?? ideaCopyExplainerOriginalLabel}
      />
      <div className="flex flex-col items-center gap-0.5 text-muted-foreground">
        <ArrowRight aria-hidden="true" className="size-4" />
        <span className="text-[10px] font-medium tracking-[0.12em] uppercase">
          {ideaCopyExplainerAction}
        </span>
      </div>
      <CopySheet
        caption={ideaCopyExplainerCopyCaption}
        emphasis
        icon={<Pencil className="size-3.5" />}
        title={ideaCopyExplainerCopyLabel}
      />
    </section>
  );
}

function CopySheet({
  caption,
  emphasis = false,
  icon,
  layered = false,
  title
}: {
  caption: string;
  emphasis?: boolean;
  icon: ReactNode;
  layered?: boolean;
  title: string;
}) {
  return (
    <div className="relative min-w-0">
      {layered ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 translate-x-1 translate-y-1 rounded-lg border border-border/70 bg-background"
        />
      ) : null}
      <div
        className={cn(
          'relative rounded-lg border px-2.5 py-2 sm:px-3',
          emphasis ? 'border-primary/30 bg-primary/5' : 'border-border bg-background'
        )}
      >
        <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <span className={emphasis ? 'text-primary' : 'text-muted-foreground'}>{icon}</span>
          <span className="min-w-0 break-words">{title}</span>
        </p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{caption}</p>
      </div>
    </div>
  );
}
