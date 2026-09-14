import { Button } from '@groam/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@groam/ui/components/dropdown-menu';
import { Check, History } from 'lucide-react';

export function AssistantChatMenu({
  activeChatId,
  chats,
  contextTitle,
  disabled,
  onSelect
}: {
  activeChatId: string | null;
  chats: ReadonlyArray<{ id: string; title: string }>;
  contextTitle: string;
  disabled: boolean;
  onSelect: (threadId: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Open AI chat history"
          disabled={disabled}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <History />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="truncate" title={contextTitle}>
          {contextTitle} chats
        </DropdownMenuLabel>
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
