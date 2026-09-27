import { AiAssistantWidget } from '@groam/ai/ui/chat/ai-assistant-widget';
import { AssistantErrorBoundary } from '@groam/ai/ui/shared/assistant-error-boundary';
import { api } from '@groam/backend/api';
import { useLocation } from '@tanstack/react-router';
import { isWorkspaceAssistantVisible } from './workspace-assistant-visibility';

export function WorkspaceAssistantWidget({ organizationId }: { organizationId: string }) {
  const { pathname } = useLocation();
  if (!isWorkspaceAssistantVisible(pathname)) return null;

  return (
    <AssistantErrorBoundary resetKey={organizationId}>
      <AiAssistantWidget api={api} key={organizationId} />
    </AssistantErrorBoundary>
  );
}
