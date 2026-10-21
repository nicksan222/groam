import { AiAssistantWidget } from '@groam/ai/ui/chat/ai-assistant-widget';
import { AssistantErrorBoundary } from '@groam/ai/ui/shared/assistant-error-boundary';
import { api } from '@groam/backend/api';
import { isChatThreadRoute } from '@/features/workspace/workspace-sidebar/sidebar-nav';
import { useLocation } from '@/lib/navigation/router';
import { isWorkspaceAssistantVisible } from './workspace-assistant-visibility';

export function WorkspaceAssistantWidget({ organizationId }: { organizationId: string }) {
  const { pathname } = useLocation();
  if (!isWorkspaceAssistantVisible(pathname)) return null;

  return (
    <AssistantErrorBoundary resetKey={organizationId}>
      <AiAssistantWidget
        api={api}
        key={organizationId}
        showMobileLauncher={isChatThreadRoute(pathname)}
      />
    </AssistantErrorBoundary>
  );
}
