import type { ToolCallComponentProps } from './assistant-tool-call-types';

export function ActivityToolCall({ presentation }: ToolCallComponentProps) {
  if (presentation.kind !== 'activity') return null;
  const isError = presentation.status === 'error';
  const isRunning = presentation.status === 'running';
  const status = isError ? 'Failed' : isRunning ? 'In progress' : 'Completed';
  return (
    <div
      className={`min-w-0 rounded-lg px-3 py-2.5 text-xs ${
        isError ? 'bg-destructive/5 text-destructive' : 'bg-muted/35 text-muted-foreground'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={
            isRunning ? 'shimmer min-w-0 font-medium' : 'min-w-0 font-medium text-foreground'
          }
        >
          {presentation.label}
        </span>
        <span
          className={`shrink-0 text-[10px] font-medium ${
            isError ? 'text-destructive' : 'text-muted-foreground'
          }`}
        >
          {status}
        </span>
      </div>
      <p className="mt-1 break-words text-[11px] leading-4 text-muted-foreground [overflow-wrap:anywhere]">
        {presentation.detail ??
          (isError
            ? 'The action did not finish. You can ask Groam to try again.'
            : isRunning
              ? 'Groam is working with the current trip context.'
              : 'The result is recorded in this conversation.')}
      </p>
    </div>
  );
}
