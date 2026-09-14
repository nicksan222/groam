import { AiAssistantWidget } from '@groam/ui/ai/chat/ai-assistant-widget';
import { AssistantErrorBoundary } from '@groam/ui/ai/shared/assistant-error-boundary';
import { useLocation } from '@tanstack/react-router';
import { isWorkspaceAssistantVisible } from './workspace-assistant-visibility';

export function WorkspaceAssistantWidget({ organizationId }: { organizationId: string }) {
  const { pathname } = useLocation();
  if (!isWorkspaceAssistantVisible(pathname)) return null;

  return (
    <AssistantErrorBoundary resetKey={organizationId}>
      <AiAssistantWidget key={organizationId} />
    </AssistantErrorBoundary>
  );
}
