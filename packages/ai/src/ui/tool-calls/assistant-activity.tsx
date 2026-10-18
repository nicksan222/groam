import { LoaderCircle } from 'lucide-react';

export type AgentActivityMode = 'connecting' | 'thinking' | 'writing';

const activityCopy: Record<AgentActivityMode, { detail: string; title: string }> = {
  connecting: {
    detail: 'Connecting Groam to this screen',
    title: 'Warming up your workspace'
  },
  thinking: {
    detail: 'Reading the context and choosing the next step',
    title: 'Thinking…'
  },
  writing: {
    detail: 'The first words are on their way',
    title: 'Writing…'
  }
};

export function AssistantActivity({
  compact = false,
  mode
}: {
  compact?: boolean;
  mode: AgentActivityMode;
}) {
  const copy = activityCopy[mode];

  return (
    <div
      aria-atomic="true"
      className={
        compact
          ? 'flex min-h-8 items-center gap-2.5 px-2 py-1 text-sm'
          : 'flex items-center gap-2.5 rounded-lg bg-muted/35 px-3 py-2 text-sm'
      }
      role="status"
    >
      <LoaderCircle
        aria-hidden="true"
        className={`shrink-0 animate-spin text-muted-foreground ${compact ? 'size-3.5' : 'size-4'}`}
      />
      <span className="min-w-0 flex-1">
        <span className="shimmer block truncate font-medium text-muted-foreground">
          {copy.title}
        </span>
        {!compact && (
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground/80">
            {copy.detail}
          </span>
        )}
      </span>
    </div>
  );
}
