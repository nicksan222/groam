import { AtSign, Paperclip, Slash } from '@groam/icons';
import type { Icon } from '@groam/icons';
import { Heading } from '@groam/ui/components/heading';
import { IconTile } from '@groam/ui/components/icon-tile';
import { ChatAvatar } from '@/features/discussions/chat/chat-avatar';
import type { DiscussionListItem } from '@/features/discussions/hooks/use-discussions';

const TIPS: Array<{ icon: Icon; text: string }> = [
  { icon: AtSign, text: 'Mention @groam for help everyone here can see' },
  { icon: Slash, text: 'Type /poll to ask everyone to vote' },
  { icon: Paperclip, text: 'Drop in photos, tickets, or links' }
];

/**
 * The top of a conversation that has no messages yet: what it is, who started it, and the three
 * things the composer can do beyond plain text. It sits where the first message will appear.
 */
export function DiscussionThreadIntro({ discussion }: { discussion: DiscussionListItem }) {
  return (
    <section
      aria-label="Start of the conversation"
      className="flex flex-col items-start gap-4 pt-8 pb-2 motion-safe:animate-in motion-safe:duration-300 motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1"
    >
      <ChatAvatar discussion={discussion} face={discussion.members[0]} size="list" />
      <div className="space-y-2">
        <Heading
          level={3}
          size="xl"
          className="leading-7 tracking-[-0.015em] text-balance text-foreground"
        >
          {discussion.title}
        </Heading>
        <p className="max-w-[56ch] text-sm leading-6 text-pretty text-muted-foreground">
          {discussion.createdBy.name} started this chat
          {discussion.tripName ? <> for {discussion.tripName}</> : null}. Everyone in it sees every
          message, including Groam&apos;s replies.
        </p>
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {TIPS.map(({ icon: TipIcon, text }) => (
          <li className="flex items-center gap-3 text-[13px] text-muted-foreground" key={text}>
            <IconTile
              className="border border-border bg-muted/60 text-foreground/70"
              radius="md"
              size="xs"
              variant="plain"
            >
              <TipIcon aria-hidden className="size-3.5" />
            </IconTile>
            {text}
          </li>
        ))}
      </ul>
    </section>
  );
}
