import { Search } from '@groam/icons';
import { Badge } from '@groam/ui/components/badge';
import { List } from '@groam/ui/components/list';
import { Link } from '@/features/workspace/navigation/router';
import type { ResearchSummary } from '@/types/research';

export function LinkedResearchItem({
  research,
  tripId
}: {
  research: ResearchSummary;
  tripId: string;
}) {
  return (
    <List.Row>
      <List.Icon>
        <Search aria-hidden className="size-4 text-muted-foreground" />
      </List.Icon>
      <List.Main>
        <List.Title asChild>
          <Link
            aria-label={`Open research: ${research.title}`}
            params={{ researchId: research.shortId, tripId }}
            to="/trips/$tripId/research/$researchId"
          >
            {research.title}
          </Link>
        </List.Title>
        {research.unread ? (
          <List.Aside>
            <Badge variant="secondary">New</Badge>
          </List.Aside>
        ) : null}
        <List.Description>
          {research.brief?.trim() || 'Open findings, notes, and sources'}
        </List.Description>
      </List.Main>
    </List.Row>
  );
}
