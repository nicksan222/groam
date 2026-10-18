import { Badge } from '@groam/ui/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@groam/ui/components/card';
import { CheckCircle2, CircleDashed, NotebookPen } from 'lucide-react';
import { testIds } from '@/lib/test-ids';
import type { AgentRunReportSection as Section } from '@/types/agents';
import { AgentRunReportItem } from './agent-run-report-item';

const toneCopy = {
  applied: {
    badge: 'On the draft',
    icon: CheckCircle2,
    rail: 'border-l-primary',
    variant: 'green' as const
  },
  attempted: {
    badge: 'Not applied',
    icon: CircleDashed,
    rail: 'border-l-chart-4',
    variant: 'amber' as const
  },
  neutral: {
    badge: 'Notes',
    icon: NotebookPen,
    rail: 'border-l-border',
    variant: 'outline' as const
  }
};

export function AgentRunReportSection({ section }: { section: Section }) {
  const tone = toneCopy[section.tone];
  const Icon = tone.icon;
  return (
    <Card
      className={`gap-0 border-l-2 py-0 pb-0 md:gap-0 md:pb-0 ${tone.rail}`}
      data-testid={testIds.agentRunReportSection}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 border-b border-border/60 px-4 py-3 md:px-4 md:py-3 [.border-b]:pb-3">
        <div className="flex min-w-0 items-start gap-2">
          <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <CardTitle className="text-sm font-medium leading-5">{section.title}</CardTitle>
        </div>
        <Badge variant={tone.variant}>{tone.badge}</Badge>
      </CardHeader>
      <CardContent className="px-4 py-3 md:px-4">
        {section.items.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {section.items.map((item) => (
              <AgentRunReportItem item={item} key={JSON.stringify(item)} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nothing listed.</p>
        )}
      </CardContent>
    </Card>
  );
}
