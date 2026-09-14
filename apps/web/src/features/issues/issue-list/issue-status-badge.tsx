import { Badge } from '@groam/ui/components/badge';
import { CheckCircle2, CircleDot } from 'lucide-react';
import { testIds } from '@/lib/test-ids';

export function IssueStatusBadge({ status }: { status: 'closed' | 'open' }) {
  const isOpen = status === 'open';
  return (
    <Badge
      data-status={status}
      data-testid={testIds.issueStatus}
      variant={isOpen ? 'emerald' : 'violet'}
    >
      {isOpen ? <CircleDot /> : <CheckCircle2 />}
      {isOpen ? 'Open' : 'Closed'}
    </Badge>
  );
}
