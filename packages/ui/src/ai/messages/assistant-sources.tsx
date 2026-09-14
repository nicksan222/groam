import { ExternalLink } from 'lucide-react';
import type { AssistantSource } from './assistant-source';

export function AssistantSources({ sources }: { sources: AssistantSource[] }) {
  return (
    <section aria-label="Sources" className="mt-2 flex flex-wrap gap-1.5">
      {sources.map((source, index) => (
        <a
          className="inline-flex max-w-full items-center gap-1 rounded-lg border border-border/70 bg-background px-2 py-1 text-[10px] text-muted-foreground shadow-xs transition-colors hover:border-primary/25 hover:text-foreground"
          href={source.url}
          key={source.url}
          rel="noreferrer"
          target="_blank"
          title={source.title}
        >
          <span className="grid size-3.5 shrink-0 place-items-center rounded-sm bg-muted text-[8px] font-semibold">
            {index + 1}
          </span>
          <span className="max-w-40 truncate">{source.title}</span>
          <ExternalLink className="size-2.5 shrink-0" />
        </a>
      ))}
    </section>
  );
}
