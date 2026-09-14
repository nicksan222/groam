import { AlertCircle, CheckCircle2, CircleDashed, CircleStop, LoaderCircle } from 'lucide-react';
import type { AgentRun } from '@/features/agents/hooks/use-agent';

const presentation = {
  aborted: {
    icon: CircleStop,
    title: 'This run was stopped',
    description: 'Any activity recorded before it stopped is available below.',
    tone: 'border-border bg-muted/30',
    iconTone: 'bg-muted text-muted-foreground'
  },
  complete: {
    icon: CheckCircle2,
    title: 'Run completed',
    description: 'Review the results and recorded activity below.',
    tone: 'border-success/25 bg-success/5',
    iconTone: 'bg-success/10 text-success-foreground'
  },
  failed: {
    icon: AlertCircle,
    title: 'This run couldn’t finish',
    description: 'Review the error below before starting another run.',
    tone: 'border-destructive/25 bg-destructive/5',
    iconTone: 'bg-destructive/10 text-destructive-foreground'
  },
  queued: {
    icon: CircleDashed,
    title: 'Ready for the next step',
    description: 'This run is queued. Activity will appear here when it starts.',
    tone: 'border-border bg-muted/30',
    iconTone: 'bg-muted text-muted-foreground'
  },
  running: {
    icon: LoaderCircle,
    title: 'Agent is working',
    description: 'Activity updates automatically as the run progresses.',
    tone: 'border-info/25 bg-info/5',
    iconTone: 'bg-info/10 text-info-foreground'
  }
} as const;

export function AgentRunOutcome({ run }: { run: AgentRun }) {
  const state = presentation[run.status];
  const Icon = state.icon;
  const providerAuthError =
    run.status === 'failed' &&
    /not authenticated|invalid api key|unauthorized/i.test(run.error ?? '');
  return (
    <section
      aria-label="Run outcome"
      aria-live="polite"
      className={`rounded-xl border p-5 sm:p-6 ${state.tone}`}
    >
      <div className="flex items-start gap-3.5">
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${state.iconTone}`}
        >
          <Icon
            aria-hidden
            className={`size-5 ${run.status === 'running' ? 'motion-safe:animate-spin' : ''}`}
          />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold tracking-tight">{state.title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {providerAuthError
              ? 'The model provider could not authenticate this run. Ask your workspace administrator to check the provider connection before trying again.'
              : state.description}
          </p>
          {run.error ? (
            <p className="mt-4 break-words whitespace-pre-wrap rounded-lg border border-destructive/15 bg-background/70 px-3.5 py-3 text-sm leading-6 text-destructive-foreground [overflow-wrap:anywhere]">
              {run.error}
            </p>
          ) : null}
          {run.status === 'failed' && run.agentId === 'reviewer' && run.proposalId ? (
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Open the related idea to review it and decide the next step.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
