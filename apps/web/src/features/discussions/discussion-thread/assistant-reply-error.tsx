import { AlertCircle } from 'lucide-react';
import { Link } from '@/features/workspace/navigation/router';

const CHATGPT_PATTERN = /chatgpt/i;

/** Quiet note under a message when Groam could not answer it. */
export function AssistantReplyError({ error, mine }: { error?: string; mine: boolean }) {
  const needsChatGpt = CHATGPT_PATTERN.test(error ?? '');
  return (
    <div className={mine ? 'flex justify-end' : 'flex justify-start'}>
      <p
        className="inline-flex max-w-[min(100%,24rem)] items-start gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs leading-5 text-muted-foreground"
        role="status"
      >
        <AlertCircle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        <span className="min-w-0">
          {needsChatGpt ? (
            <>
              Groam needs your ChatGPT plan to reply.{' '}
              <Link
                className="rounded-sm font-medium text-foreground underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                params={{ section: 'ai' }}
                to="/settings/$section"
              >
                Connect ChatGPT
              </Link>
            </>
          ) : (
            <>Groam couldn&apos;t reply: {error ?? 'Something went wrong'}</>
          )}
        </span>
      </p>
    </div>
  );
}
