import { MessageSquare, Users } from '@groam/icons';

/** Desktop landing canvas before selecting a conversation. */
export function ChatEmptyPane() {
  return (
    <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-background px-8 py-12">
      <div className="max-w-sm">
        <MessageSquare aria-hidden="true" className="mb-8 size-10 stroke-1 text-primary" />
        <h2 className="text-4xl font-semibold tracking-tight text-balance">Your messages</h2>
        <p className="mt-4 text-xl leading-8 text-muted-foreground text-pretty">
          Good plans start with a conversation.
        </p>
        <p className="mt-6 text-sm leading-6 text-muted-foreground">
          Select a chat to start messaging with your group.
        </p>
        <div className="mt-8 flex items-center gap-2 border-t border-border pt-5 text-xs text-muted-foreground">
          <Users aria-hidden="true" className="size-4" />
          A shared space for your group and Groam.
        </div>
      </div>
    </div>
  );
}
