import Shell from '@groam/ui/components/shell/client';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import type { ResearchDetail } from '@/types/research';

/** A research thread's page header: Research, then the topic. */
export function ResearchHeader({ research }: { research: ResearchDetail }) {
  return (
    <Shell.Header
      data-testid={testIds.researchHeader}
      parent={
        <Link
          params={{ section: 'research', tripId: research.tripId }}
          to="/trips/$tripId/$section"
        >
          Research
        </Link>
      }
      title={research.title}
    />
  );
}
