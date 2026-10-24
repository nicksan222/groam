import { ChatMessageActionToolbar, ChatReactionPicker } from '@groam/ui/components/chat';
import { testIds } from '@/lib/test-ids';
import { ThreadMessageMenu } from './thread-message-menu';
import { THREAD_REACTION_STAMPS, type ThreadReactionStamp } from './thread-message-stamps';

/** Hover tools beside a message bubble: react, and edit or delete for the author. */
export function ThreadMessageToolbar({
  mine,
  onEdit,
  onReact,
  onRemove,
  stamps
}: {
  mine: boolean;
  onEdit?: () => void;
  onReact: (emoji: string) => void;
  onRemove?: () => void;
  stamps: ThreadReactionStamp[];
}) {
  const selected = stamps.filter((stamp) => stamp.mine).map((stamp) => stamp.emoji);
  const menu =
    onEdit || onRemove
      ? {
          menuChildren: <ThreadMessageMenu onEdit={onEdit} onRemove={onRemove} />,
          moreLabel: 'Message actions',
          moreTestId: testIds.chatMessageMenu,
          moreTooltip: 'Message actions'
        }
      : {};
  return (
    <ChatMessageActionToolbar
      reactionPicker={(toolbarRef) => (
        <ChatReactionPicker
          inToolbar
          onSelect={onReact}
          options={THREAD_REACTION_STAMPS}
          // coss: anchored to the toolbar, the picker opens toward the bubble.
          popupAlign={mine ? 'start' : 'end'}
          popupAnchor={toolbarRef}
          popupLabel="React to this message"
          selectedEmojis={selected}
          triggerLabel="Add reaction"
          triggerTestId={testIds.chatMessageReact}
          triggerTooltip="Add reaction"
        />
      )}
      side={mine ? 'outgoing' : 'incoming'}
      toolbarLabel="Message tools"
      {...menu}
    />
  );
}
