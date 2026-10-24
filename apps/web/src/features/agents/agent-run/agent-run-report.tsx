import { Card, CardContent } from '@groam/ui/components/card';
import { Markdown } from '@groam/ui/components/markdown';
import { testIds } from '@/lib/test-ids';
import { AgentRunReportItem } from './agent-run-report-item';
import { AgentRunReportSection } from './agent-run-report-section';
import { parseAgentRunReport } from './parse-agent-run-report';

export function AgentRunReport({ report }: { report: string }) {
  const parsed = parseAgentRunReport(report);
  // Research and narrative reports are documents. Only draft-change reports need
  // the structured applied/not-applied presentation and extracted field badges.
  if (!parsed.sections.some((section) => section.tone !== 'neutral')) {
    return (
      <Card
        className="min-w-0 px-4 py-4 sm:px-6"
        data-testid={testIds.agentRunReport}
        variant="plain"
      >
        <Markdown
          className="min-w-0 [overflow-wrap:anywhere] [&_[data-streamdown=table-wrapper]]:max-w-full [&_[data-streamdown=table]]:min-w-[40rem] [&_[data-streamdown=table-cell]]:min-w-40 [&_[data-streamdown=table-cell]]:align-top"
          tableMaxHeight="none"
        >
          {report}
        </Markdown>
      </Card>
    );
  }
  return (
    <section data-testid={testIds.agentRunReport}>
      <div className="flex flex-col gap-3">
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
