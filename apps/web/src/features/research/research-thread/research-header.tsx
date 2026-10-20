import { PageCrumbNav } from '@groam/ui/components/page-crumb-nav';
import Shell from '@groam/ui/components/shell/client';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import type { ResearchDetail } from '@/types/research';

export function ResearchHeader({
  activeView = 'overview',
  onViewChange,
  research
}: {
  activeView?: string;
  onViewChange?: (view: string) => void;
  research: ResearchDetail;
}) {
  return (
    <Shell.Banner className="border-b border-border/40" data-testid={testIds.researchHeader}>
      <Shell.BannerInset className="flex min-w-0 flex-col gap-1.5 py-2.5 sm:py-3">
        <PageCrumbNav
          inset={false}
          parent={{
            asChild: true,
            children: (
              <Link
                params={{ section: 'research', tripId: research.tripId }}
                to="/trips/$tripId/$section"
              />
            ),
            label: 'Trip research'
          }}
        />
        <Shell.Title className="min-w-0 break-words">{research.title}</Shell.Title>
      </Shell.BannerInset>
      {onViewChange ? (
        <Shell.UnderlineNav aria-label="Research views">
          {['Overview', 'Notes'].map((title) => (
            <Shell.Tab
              isActive={activeView === title.toLowerCase()}
              key={title}
              onClick={() => onViewChange(title.toLowerCase())}
              position="top"
              title={title}
            />
          ))}
        </Shell.UnderlineNav>
      ) : null}
    </Shell.Banner>
  );
}
