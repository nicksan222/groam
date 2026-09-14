import { createFileRoute, Outlet } from '@tanstack/react-router';
import { ChatWorkspace } from '@/features/discussions/chat/chat-workspace';

export const Route = createFileRoute('/_workspace/chat')({
  component: ChatLayout
});

function ChatLayout() {
  return (
    <ChatWorkspace>
      <Outlet />
    </ChatWorkspace>
  );
}
