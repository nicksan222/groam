import { Badge } from '@groam/ui/components/badge';
import type { AgentRunReportItem as Item } from '@/types/agents';

export function AgentRunReportItem({ item }: { item: Item }) {
  return (
    <li className="flex flex-col gap-2">
      <p className="text-sm leading-6 text-foreground">
        {item.segments.map((segment, index) => {
          if (segment.type === 'emphasis') {
            return (
              <strong className="font-medium" key={index}>
                {segment.value}
              </strong>
            );
          }
          if (segment.type === 'money') {
            return (
              <span className="font-medium tabular-nums" key={index}>
                {segment.value}
              </span>
            );
          }
          if (segment.type === 'id') {
            return (
              <code
                className="mx-0.5 font-mono text-[11px] leading-none text-muted-foreground"
                key={index}
              >
                {segment.value}
              </code>
            );
          }
          return <span key={index}>{segment.value}</span>;
        })}
      </p>
      {item.fields.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {item.fields.map((field) => (
            <li key={`${field.label}-${field.raw}`}>
              <Badge className="max-w-full gap-1.5 font-normal" variant="secondary">
                <span className="text-muted-foreground">{field.label}</span>
                {field.ids.length > 1 ? (
                  <span className="tabular-nums">{field.ids.length}</span>
                ) : null}
                <code className="max-w-[12rem] truncate font-mono text-[10px] text-muted-foreground">
                  {field.ids.length > 0 ? field.ids.join(', ') : field.raw}
                </code>
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
