import { ArrowUpRight } from '@groam/icons';
import { MutedCopy } from '@groam/ui/components/muted-copy';
import type { ResearchSource } from '@/types/research';

/** Links cited in the latest report and in loaded notes, numbered for quick reference. */
export function ResearchSources({
  loading,
  sources
}: {
  loading: boolean;
  sources: ResearchSource[];
}) {
  return (
    <section aria-labelledby="research-sources-heading" className="min-w-0 space-y-1">
      <h2 className="text-xs font-medium text-muted-foreground" id="research-sources-heading">
        Sources
      </h2>
      {sources.length ? (
        <ol>
          {sources.map((source, index) => (
            <li key={source.href}>
              <a
                className="group flex items-baseline gap-3 rounded-sm py-2 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                href={source.href}
                rel="noopener noreferrer"
                target="_blank"
              >
                <span className="w-4 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium break-words">
                    {source.host.replace(/^www\./, '')}
                  </span>
                  {source.path ? (
                    <span className="block text-xs leading-relaxed break-all text-muted-foreground">
                      {source.path}
                    </span>
                  ) : null}
                </span>
                <ArrowUpRight
                  aria-hidden
                  className="size-3.5 shrink-0 text-muted-foreground group-hover:text-primary"
                />
                <span className="sr-only">Open source in a new tab</span>
              </a>
            </li>
          ))}
        </ol>
      ) : (
        <MutedCopy className="py-1" role="status">
          {loading
            ? 'Looking for source links…'
            : 'No sources yet. Links from reports and notes appear here.'}
        </MutedCopy>
      )}
    </section>
  );
}
