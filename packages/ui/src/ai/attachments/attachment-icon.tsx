import type { AssistantContextTagKind } from '@groam/ai-contracts/agents/registry';
import { CalendarDays, MapPin, Route } from 'lucide-react';

export function AttachmentIcon({ kind }: { kind: AssistantContextTagKind }) {
  if (kind === 'activity') return <CalendarDays className="size-3" />;
  if (kind === 'destination') return <MapPin className="size-3" />;
  return <Route className="size-3" />;
}
