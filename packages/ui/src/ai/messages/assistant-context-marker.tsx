import {
  assistantAgents,
  type parseAssistantContextMessage
} from '@groam/ai-contracts/agents/registry';
import { MapPin } from 'lucide-react';

export function AssistantContextMarker({
  context
}: {
  context: NonNullable<ReturnType<typeof parseAssistantContextMessage>>;
}) {
  const tagLabels = context.tags.map((tag) => tag.label).join(', ');
  return (
    <div
      aria-label={`Context: ${context.title}, ${assistantAgents[context.agent].mention}${tagLabels ? `, tagged ${tagLabels}` : ''}`}
      className="flex items-center gap-2 py-1 text-[11px] text-muted-foreground"
      role="note"
    >
      <span className="h-px min-w-3 flex-1 bg-border/70" />
      <span className="inline-flex min-w-0 max-w-[76%] items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-2.5 py-1 shadow-xs backdrop-blur-sm">
        <MapPin className="size-3 shrink-0 text-primary" />
        <span className="truncate" title={tagLabels || undefined}>
          {context.title}
          {tagLabels ? ` · ${tagLabels}` : ''}
        </span>
        <span className="shrink-0 font-medium text-foreground/70">
          {assistantAgents[context.agent].mention}
        </span>
      </span>
      <span className="h-px min-w-3 flex-1 bg-border/70" />
    </div>
  );
}
