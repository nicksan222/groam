import Timeline from '@groam/ui/components/timeline';
import { AlertCircle, CheckCircle2, CircleDashed, CircleStop, LoaderCircle } from 'lucide-react';
import type { AgentRun } from '@/features/agents/hooks/use-agent';
import { AgentRunToolbar } from './agent-run-toolbar';

const presentation = {
  aborted: {
    icon: CircleStop,
    title: 'Run stopped',
    description: 'Activity recorded before it stopped is above.',
    badge: 'text-muted-foreground',
    card: ''
  },
  complete: {
    icon: CheckCircle2,
    title: 'Run completed',
    description: 'Results and activity are above.',
    badge: 'border-success/40 bg-success/10 text-success-foreground',
    card: 'border-success/30'
  },
  failed: {
    icon: AlertCircle,
    title: 'Run failed',
    description: 'Check the error before retrying.',
    badge: 'border-destructive/40 bg-destructive/10 text-destructive',
    card: 'border-destructive/30'
  },
  queued: {
    icon: CircleDashed,
    title: 'Queued',
    description: 'Activity appears when the run starts.',
    badge: 'text-muted-foreground',
    card: ''
  },
  running: {
    icon: LoaderCircle,
    title: 'Agent is working',
    description: 'Activity updates as the run progresses.',
    badge: 'border-info/40 bg-info/10 text-info-foreground',
    card: 'border-info/30'
  }
} as const;

const providerErrorPattern =
  /not authenticated|not configured|api key|unauthori[sz]ed|forbidden|\b40[13]\b|quota|insufficient credits|no (ai )?provider/i;

/** Closing timeline entry: where the run ended up and what you can do next. */
export function AgentRunOutcome({
  onRetry,
  onStop,
  run
}: {
  onRetry?: (runId: AgentRun['id']) => Promise<unknown> | unknown;
  onStop?: (runId: AgentRun['id']) => Promise<unknown> | unknown;
  run: AgentRun;
}) {
  const state = presentation[run.status];
  const Icon = state.icon;
  const providerError = run.status === 'failed' && providerErrorPattern.test(run.error ?? '');
  const description = providerError
    ? 'The model provider is not set up for this workspace. Add or fix a key in AI settings.'
    : run.status === 'failed' && run.agentId === 'reviewer' && run.proposalId
      ? 'Open the related idea to decide the next step.'
      : state.description;
  return (
    <Timeline.Item>
      <Timeline.Badge className={state.badge}>
        <Icon aria-hidden className={run.status === 'running' ? 'motion-safe:animate-spin' : ''} />
      </Timeline.Badge>
      <Timeline.Body className="block">
        <Timeline.Card aria-label="Run outcome" aria-live="polite" className={state.card}>
          <Timeline.CardBody className="space-y-1 px-3 py-2.5">
            <p className="text-sm font-medium">{state.title}</p>
            <p className="text-xs leading-5 text-muted-foreground">{description}</p>
            {run.error ? (
              <p className="mt-2 rounded-md bg-destructive/5 px-2.5 py-1.5 font-mono text-xs leading-5 break-words whitespace-pre-wrap text-destructive [overflow-wrap:anywhere]">
                {run.error}
              </p>
            ) : null}
          </Timeline.CardBody>
          {onRetry ? (
            <Timeline.CardActions className="justify-end border-t bg-muted/25 py-2">
              <AgentRunToolbar
                onRetry={onRetry}
                onStop={onStop}
                providerError={providerError}
                run={run}
              />
            </Timeline.CardActions>
          ) : null}
        </Timeline.Card>
      </Timeline.Body>
    </Timeline.Item>
  );
}
