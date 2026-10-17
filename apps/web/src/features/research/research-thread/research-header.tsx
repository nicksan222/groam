import { testIds } from '@/lib/test-ids';
import type { ResearchDetail } from '@/types/research';

/** Title and brief only; research actions live above the composer. */
export function ResearchHeader({ research }: { research: ResearchDetail }) {
  return (
    <header
      className="grid shrink-0 gap-0.5 border-b border-border/70 px-4 py-3"
      data-testid={testIds.researchHeader}
    >
      <h1 className="min-w-0 truncate text-base font-semibold">{research.title}</h1>
      {research.brief ? (
        <p className="line-clamp-2 text-sm text-muted-foreground">{research.brief}</p>
      ) : null}
    </header>
  );
}
