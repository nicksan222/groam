import { Button } from '@groam/ui/components/button';
import { cn } from '@groam/ui/lib/utils';
import { LockKeyhole, SquarePen, X } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { useAssistant } from '#src/ai/hooks/use-assistant';
import type { useAssistantChats } from '#src/ai/hooks/use-assistant-chats';
import type { AssistantAttachments } from '#tsx/ai/attachments/assistant-attachments';
import { AssistantChatMenu } from '#tsx/ai/chat/assistant-chat-menu';
import { AssistantComposer } from '#tsx/ai/chat/assistant-composer';
import { AssistantContextBar } from '#tsx/ai/chat/assistant-context-bar';
import { AssistantConversation } from '#tsx/ai/chat/assistant-conversation';
import type { AgentScreenContext } from '#tsx/ai/context/agent-context';

const SIDECHAT_WIDTH = '26rem';

export function AssistantSidechatPanel({
  assistant,
  attachments,
  canSend,
  chats,
  contextChats,
  context,
  onClose,
  onStartNew
}: {
  assistant: ReturnType<typeof useAssistant>;
  attachments: AssistantAttachments | undefined;
  canSend: boolean;
  chats: ReturnType<typeof useAssistantChats>;
  contextChats: ReturnType<typeof useAssistantChats>['chats'];
  context: AgentScreenContext | null;
  onClose: () => void;
  onStartNew: () => Promise<void>;
}) {
  return (
    <>
      <button
        aria-label="Close Groam AI"
        className="fixed inset-0 z-50 bg-muted/80 md:hidden"
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby="ai-assistant-widget-title"
        className={cn(
          'ai-assistant-widget-panel fixed inset-y-0 right-0 z-50 flex h-svh w-full flex-col border-l border-border bg-background text-foreground shadow-xl md:w-(--ai-sidechat-width)'
        )}
        id="ai-assistant-widget"
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
        }}
        style={{ '--ai-sidechat-width': SIDECHAT_WIDTH } as CSSProperties}
      >
        <header className="flex h-[49px] shrink-0 items-center gap-2 border-b border-border px-4">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium" id="ai-assistant-widget-title">
              Groam AI
            </span>
            <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              <LockKeyhole className="size-3 shrink-0" />
              <span className="truncate">
                Private · {context ? context.title : 'No screen context'}
              </span>
            </span>
          </span>
          <ShortcutHint />
          <AssistantChatMenu
            activeChatId={assistant.threadId}
            chats={contextChats}
            contextTitle={context?.title ?? 'This page'}
            disabled={assistant.isResponding || chats.isLoading}
            onSelect={assistant.selectThread}
          />
          <Button
            aria-label="Start new AI chat"
            disabled={assistant.isResponding || chats.isCreating}
            onClick={() => void onStartNew()}
            size="icon-sm"
            title="New AI chat"
            type="button"
            variant="ghost"
          >
            <SquarePen />
          </Button>
          <Button
            aria-label="Close AI assistant"
            onClick={onClose}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <X />
          </Button>
        </header>
        <AssistantContextBar
          attachments={chats.chats.find((chat) => chat.id === assistant.threadId)?.tags ?? []}
          pageTitle={context?.title ?? null}
        />
        <div className="flex min-h-0 w-full flex-1 flex-col md:w-(--ai-sidechat-width)">
          <AssistantConversation
            context={context}
            isOpening={assistant.isOpening}
            isSending={assistant.isResponding}
            loadMore={assistant.loadMore}
            messages={assistant.messages}
            onReply={assistant.send}
            onResend={assistant.resend}
            status={assistant.status}
          />
          <AssistantComposer
            attachments={attachments}
            contextAvailable={context !== null}
            disabled={!canSend}
            focusOnMount
            isSending={assistant.isResponding}
            isStopping={assistant.isStopping}
            key={assistant.threadId}
            onStop={assistant.canStop ? assistant.stop : undefined}
            onSubmit={assistant.send}
          />
        </div>
      </section>
    </>
  );
}

function ShortcutHint() {
  return (
    <kbd
      aria-label="Keyboard shortcut: Control or Command plus period"
      className="hidden font-sans text-[11px] font-normal text-muted-foreground sm:inline-flex"
      title="Ctrl/⌘ + ."
    >
      ⌘ .
    </kbd>
  );
}
