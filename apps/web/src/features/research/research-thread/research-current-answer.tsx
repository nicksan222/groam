import { ChevronDown, Sparkles } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { Markdown } from '@groam/ui/components/markdown';
import { useState } from 'react';

const runDate = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });

/** Pins the latest answer above the history; the full report stays one click away. */
export function ResearchCurrentAnswer({
  answer,
  completedAt,
  report
}: {
  answer: null | string;
  completedAt: null | number;
  report: string;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <section
      aria-labelledby="research-current-answer"
      className="rounded-lg border border-primary/25 bg-primary/5 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2
          className="inline-flex items-center gap-1 text-xs font-medium text-primary"
          id="research-current-answer"
        >
          <Sparkles aria-hidden className="size-3.5" />
          {answer ? 'Current answer' : 'Latest report'}
        </h2>
        {completedAt ? (
          <span className="text-xs text-muted-foreground">
            from the {runDate.format(completedAt)} run
          </span>
        ) : null}
      </div>
      {answer ? (
        <p className="mt-2 text-base leading-7 font-medium text-balance">{answer}</p>
      ) : null}
      <Button
        aria-expanded={expanded}
        className="mt-1 -ml-2 text-primary"
        onClick={() => setExpanded(!expanded)}
        size="xs"
        variant="ghost"
      >
        <ChevronDown
          aria-hidden
          className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
        {expanded ? 'Hide full report' : 'Read full report'}
      </Button>
      {expanded ? (
        <article aria-label="Research report" className="mt-3 border-t border-primary/15 pt-3">
          <Markdown className="min-w-0 break-words [overflow-wrap:anywhere] [&_p]:leading-7">
            {report}
          </Markdown>
        </article>
      ) : null}
    </section>
  );
}
