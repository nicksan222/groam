import { Button } from '@groam/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@groam/ui/components/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@groam/ui/components/popover';
import { cn } from '@groam/ui/lib/utils';
import { MoreHorizontal, Pencil, SmilePlus, Trash2 } from 'lucide-react';
import { useThreadMessageChrome } from '@/features/discussions/hooks/use-thread-message-chrome';
import { useConfirm } from '@/features/workspace/workspace-shell/use-confirm-dialog';
import { testIds } from '@/lib/test-ids';
import { THREAD_REACTION_STAMPS, type ThreadReactionStamp } from './thread-message-stamps';

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
  const confirm = useConfirm();
  const { chromeOpen, pickerOpen, setMenuOpen, setPickerOpen } = useThreadMessageChrome();
  const canManage = Boolean(onEdit || onRemove);
  const pressed = new Set<string>();
  for (const stamp of stamps) {
    if (stamp.mine) pressed.add(stamp.emoji);
  }

  const remove = async () => {
    if (!onRemove) return;
    if (!(await confirm('Delete this message?', 'It will be removed for everyone in this chat.'))) {
      return;
    }
    onRemove();
  };

  return (
    <div
      className={cn(
        'z-20 flex w-fit items-center gap-0.5 rounded-full border border-border/60 bg-popover p-0.5 text-foreground shadow-sm',
        'max-md:mt-1.5',
        mine ? 'max-md:ml-auto' : 'max-md:mr-auto',
        'md:absolute md:top-0 md:mt-0 md:-translate-y-1/2',
        mine ? 'md:left-0 md:-translate-x-1' : 'md:right-0 md:translate-x-1',
        'md:pointer-events-none md:opacity-0',
        'md:group-hover/chat-message:pointer-events-auto md:group-hover/chat-message:opacity-100',
        'md:group-focus-within/chat-message:pointer-events-auto md:group-focus-within/chat-message:opacity-100',
        chromeOpen && 'md:pointer-events-auto md:opacity-100'
      )}
    >
      <Popover onOpenChange={setPickerOpen} open={pickerOpen}>
        <PopoverTrigger asChild>
          <Button
            aria-label="Add reaction"
            className="rounded-full text-muted-foreground hover:text-foreground"
            data-testid={testIds.chatMessageReact}
            size="icon-sm"
            title="Add reaction"
            variant="ghost"
          >
            <SmilePlus />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align={mine ? 'end' : 'start'}
          className="w-auto rounded-full border-border/50 p-1 shadow-md"
          side="top"
          sideOffset={6}
        >
          <fieldset className="m-0 flex items-center gap-0.5 border-0 p-0">
            <legend className="sr-only">React to this message</legend>
            {THREAD_REACTION_STAMPS.map((stamp) => {
              const isPressed = pressed.has(stamp.emoji);
              return (
                <button
                  aria-label={stamp.label}
                  aria-pressed={isPressed}
                  className={cn(
                    'grid size-9 place-items-center rounded-full text-base transition-colors',
                    'hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
                    isPressed && 'bg-primary/15 ring-1 ring-primary/35'
                  )}
                  key={stamp.emoji}
                  onClick={() => {
                    onReact(stamp.emoji);
                    setPickerOpen(false);
                  }}
                  type="button"
                >
                  <span aria-hidden="true">{stamp.emoji}</span>
                </button>
              );
            })}
          </fieldset>
        </PopoverContent>
      </Popover>
      {canManage ? (
        <DropdownMenu onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label="Message actions"
              className="rounded-full text-muted-foreground hover:text-foreground"
              data-testid={testIds.chatMessageMenu}
              size="icon-sm"
              title="Message actions"
              variant="ghost"
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={mine ? 'end' : 'start'} className="min-w-36">
            {onEdit ? (
              <DropdownMenuItem data-testid={testIds.chatMessageEdit} onSelect={onEdit}>
                <Pencil />
                Edit
              </DropdownMenuItem>
            ) : null}
            {onRemove ? (
              <DropdownMenuItem
                data-testid={testIds.chatMessageDelete}
                onSelect={() => void remove()}
                variant="destructive"
              >
                <Trash2 />
                Delete
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
