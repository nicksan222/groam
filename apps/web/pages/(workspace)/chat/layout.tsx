import { ChatWorkspace } from '@/features/discussions/chat/chat-workspace';
import type { LayoutProps } from '@/lib/navigation/router';

/** The chat list stays mounted beside whichever discussion is open. */
export default function ChatLayout({ children }: LayoutProps) {
  return <ChatWorkspace>{children}</ChatWorkspace>;
}
