import { Card, CardContent } from '@groam/ui/components/card';
import { FileText } from 'lucide-react';
import { testIds } from '@/lib/test-ids';
import { AgentRunReportItem } from './agent-run-report-item';
import { AgentRunReportSection } from './agent-run-report-section';
import { parseAgentRunReport } from './parse-agent-run-report';

export function AgentRunReport({ report }: { report: string }) {
  const parsed = parseAgentRunReport(report);
  return (
    <section data-testid={testIds.agentRunReport}>
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <FileText aria-hidden className="size-4 text-muted-foreground" />
        Report
      </h2>
      <div className="mt-3 flex flex-col gap-3">
        {parsed.lead.length > 0 ? (
          <Card className="gap-0 py-0 pb-0 md:gap-0 md:pb-0">
            <CardContent className="px-4 py-3 md:px-4">
              <ul className="flex flex-col gap-3">
                {parsed.lead.map((item) => (
                  <AgentRunReportItem item={item} key={JSON.stringify(item)} />
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}
        {parsed.sections.map((section) => (
          <AgentRunReportSection key={JSON.stringify(section)} section={section} />
        ))}
      </div>
    </section>
  );
}
