import { EmptyScreen } from '@groam/ui/components/empty-screen';
import { MessageSquare } from 'lucide-react';

/** Quiet desktop canvas when no conversation is open. */
export function ChatEmptyPane() {
  return (
    <EmptyScreen
      className="h-full min-h-0 flex-1 rounded-none"
      description="Select a chat to start messaging with your group."
      headline="Your messages"
      icon={MessageSquare}
    />
  );
}
