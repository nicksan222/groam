import { ChatReactionChip } from '@groam/ui/components/chat';
import type { ThreadReactionStamp } from './thread-message-stamps';

/** Reaction chips under a message; tapping one toggles the viewer's reaction. */
export function ThreadMessageReactions({
  mine,
  onReact,
  stamps
}: {
  mine: boolean;
  onReact: (emoji: string) => void;
  stamps: ThreadReactionStamp[];
}) {
  if (stamps.length === 0) return null;

  return stamps.map((stamp) => (
    <ChatReactionChip
      count={stamp.count}
      emoji={stamp.emoji}
      key={stamp.emoji}
      label={`${stamp.label}${stamp.count > 1 ? `, ${stamp.count}` : ''}`}
      onClick={() => onReact(stamp.emoji)}
      popupAlign={mine ? 'end' : 'start'}
      selected={stamp.mine}
    />
  ));
}
