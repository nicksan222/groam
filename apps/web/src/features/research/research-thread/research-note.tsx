import { assistantReplyText } from '@groam/ai/ui/messages/assistant-run-activities';
import { Paperclip, Sparkles } from '@groam/icons';
import { Markdown } from '@groam/ui/components/markdown';
import { AssistantReplyError } from '@/features/discussions/discussion-thread/assistant-reply-error';
import { discussionMessageBody } from '@/features/discussions/discussion-thread/discussion-message-body';
import type { DiscussionMessage } from '@/types/discussions';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short'
});

export function ResearchNote({ message }: { message: DiscussionMessage }) {
  const ai = message.role === 'assistant';
  const body = discussionMessageBody(message);
  const text = ai ? assistantReplyText(body.text) : body.text;
  return (
    <article className="min-w-0 py-6 first:pt-0">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2 font-medium text-foreground">
          {ai ? <Sparkles aria-hidden className="size-3.5 text-muted-foreground" /> : null}
          {ai ? 'AI note' : (message.author?.name ?? (message.mine ? 'You' : 'Participant'))}
        </span>
        <time className="tabular-nums" dateTime={new Date(message._creationTime).toISOString()}>
          {dateFormatter.format(message._creationTime)}
        </time>
      </header>
      {text ? (
        <Markdown
          className="wrap-break-word whitespace-normal [&_[data-streamdown=link]]:break-all"
          streaming={message.status === 'streaming'}
        >
          {text}
        </Markdown>
      ) : null}
      {body.attachments.length ? (
        <ul aria-label="Attachments" className="mt-4 flex flex-wrap gap-2">
          {body.attachments.map((attachment) => (
            <li className="min-w-0 max-w-full" key={attachment.id}>
              {attachment.url ? (
                <a
                  className="inline-flex max-w-full items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-xs hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-ring"
                  href={attachment.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Paperclip aria-hidden className="size-3.5 shrink-0" />
                  <span className="truncate">{attachment.name}</span>
                </a>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {attachment.name} · Uploading…
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
      {message.status === 'pending' || message.status === 'streaming' ? (
        <p className="mt-3 text-xs text-muted-foreground" role="status">
          {ai ? 'Writing…' : 'Saving note…'}
        </p>
      ) : null}
      {message.assistantStatus === 'failed' ? (
        <div className="mt-3">
          <AssistantReplyError error={message.assistantError} mine={false} />
        </div>
      ) : null}
    </article>
  );
}
