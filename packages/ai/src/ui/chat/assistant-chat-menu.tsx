import { Check, ChevronDown } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@groam/ui/components/dropdown-menu';

export function AssistantChatMenu({
  activeChatId,
  chats,
  disabled,
  onSelect,
  title
}: {
  activeChatId: string | null;
  chats: ReadonlyArray<{ id: string; title: string }>;
  disabled: boolean;
  onSelect: (threadId: string) => void;
  title: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Open AI chat history"
          className="h-11 min-w-0 flex-1 justify-start gap-2 px-2 text-sm font-medium xl:h-8"
          disabled={disabled}
          title={title}
          type="button"
          variant="ghost"
        >
          <span className="truncate" id="ai-assistant-widget-title">
            {title}
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[min(20rem,calc(100vw-1rem))]">
        <DropdownMenuLabel>Chat history</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {chats.length === 0 ? (
          <DropdownMenuItem disabled>No previous chats</DropdownMenuItem>
        ) : (
          chats.map((chat) => (
            <DropdownMenuItem key={chat.id} onClick={() => onSelect(chat.id)}>
              <span className="min-w-0 flex-1 truncate">{chat.title}</span>
              {chat.id === activeChatId ? <Check className="ml-2" /> : null}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
