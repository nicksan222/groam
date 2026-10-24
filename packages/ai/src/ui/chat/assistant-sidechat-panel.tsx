import { Maximize2, Minimize2, Plus, X } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { Sheet, SheetContent, SheetTitle } from '@groam/ui/components/sheet';
import { type CSSProperties, useEffect, useState } from 'react';
import type { AssistantAttachments } from '#ai/ui/attachments/assistant-attachments';
import { AssistantChatMenu } from '#ai/ui/chat/assistant-chat-menu';
import { AssistantComposer } from '#ai/ui/chat/assistant-composer';
import { AssistantContextBar } from '#ai/ui/chat/assistant-context-bar';
import { AssistantConversation } from '#ai/ui/chat/assistant-conversation';
import type { AgentScreenContext } from '#ai/ui/context/agent-context';
import type { useAssistant } from '#ai/ui/hooks/use-assistant';
import type { useAssistantChats } from '#ai/ui/hooks/use-assistant-chats';

const DEFAULT_SIDECHAT_WIDTH = '28rem';
const WIDE_SIDECHAT_WIDTH = '40rem';

export type AssistantSidechatPanelProps = {
  assistant: ReturnType<typeof useAssistant>;
  attachments: AssistantAttachments | undefined;
  canSend: boolean;
  chats: ReturnType<typeof useAssistantChats>;
  contextChats: ReturnType<typeof useAssistantChats>['chats'];
  context: AgentScreenContext | null;
  draft: string;
  onClose: () => void;
  onDraftChange: (draft: string) => void;
  onStartNew: () => Promise<void>;
};

export function AssistantSidechatPanel(props: AssistantSidechatPanelProps) {
  const [isWide, setIsWide] = useState(false);
  const width = isWide ? WIDE_SIDECHAT_WIDTH : DEFAULT_SIDECHAT_WIDTH;
  const content = (
    <PanelContent
      {...props}
      isWide={isWide}
      onToggleWidth={() => setIsWide((current) => !current)}
    />
  );

  return (
    <Sheet
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
      open
    >
      <SheetContent
        aria-describedby={undefined}
        className="ai-assistant-widget-panel inset-y-0 right-0 h-dvh w-full max-w-(--ai-sidechat-width) gap-0 overflow-hidden border-0 bg-popover p-0 text-popover-foreground shadow-lg/5 sm:inset-y-4 sm:right-4 sm:h-auto sm:w-[calc(100%-2rem)] sm:rounded-2xl sm:border"
        hideCloseButton
        overlayClassName="bg-black/32 backdrop-blur-sm"
        id="ai-assistant-widget"
        style={{ '--ai-sidechat-width': width } as CSSProperties}
      >
        <SheetTitle className="sr-only">Groam AI</SheetTitle>
        {content}
      </SheetContent>
    </Sheet>
  );
}

function PanelContent({
  assistant,
  attachments,
  canSend,
  chats,
  contextChats,
  context,
  draft,
  isWide,
  onClose,
  onDraftChange,
  onStartNew,
  onToggleWidth
}: AssistantSidechatPanelProps & {
  isWide: boolean;
  onToggleWidth: () => void;
}) {
  useEffect(() => {
    if (!isWide || assistant.messages.length > 0) return;
    const frame = requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(
          '#ai-assistant-widget [data-slot="chat-conversation"] [data-slot="scroll-area-viewport"]'
        )
        ?.scrollTo({ top: 0 });
    });
    return () => cancelAnimationFrame(frame);
  }, [assistant.messages.length, isWide]);

  const activeChat = contextChats.find((chat) => chat.id === assistant.threadId);
  const conversationTitle = activeChat?.title.trim() || 'Groam AI';

  return (
    <>
      <header className="flex min-h-14 shrink-0 items-center gap-1 px-3 pt-2 pb-1 sm:px-4">
        <AssistantChatMenu
          activeChatId={assistant.threadId}
          chats={contextChats}
          disabled={assistant.isResponding || chats.isLoading}
          onSelect={assistant.selectThread}
          title={conversationTitle}
        />
        <span className="ml-auto flex shrink-0 items-center gap-1">
          <Button
            aria-label="Start new AI chat"
            className="size-11 xl:size-8"
            disabled={assistant.isResponding || chats.isCreating}
            onClick={() => void onStartNew()}
            size="icon-sm"
            title="New AI chat"
            type="button"
            variant="ghost"
          >
            <Plus />
          </Button>
          <Button
            aria-label={isWide ? 'Use standard AI panel width' : 'Widen AI panel'}
            aria-pressed={isWide}
            className="size-11 xl:size-8"
            onClick={onToggleWidth}
            size="icon-sm"
            title={isWide ? 'Use standard width' : 'Widen panel'}
            type="button"
            variant="ghost"
          >
            {isWide ? <Minimize2 /> : <Maximize2 />}
          </Button>
          <Button
            aria-label="Close AI assistant"
            className="size-11 xl:size-8"
            onClick={onClose}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <X />
          </Button>
        </span>
      </header>
      <div className="flex min-h-0 w-full flex-1 flex-col">
        <AssistantConversation
          context={context}
          isConnecting={assistant.isLoading}
          isSending={assistant.isResponding}
          loadMore={assistant.loadMore}
          messages={assistant.messages}
          onReply={assistant.send}
          onResend={assistant.resend}
          status={assistant.status}
          unavailable={!canSend}
        />
        <AssistantContextBar
          attachments={chats.chats.find((chat) => chat.id === assistant.threadId)?.tags ?? []}
          pageTitle={context?.title ?? null}
        />
        <AssistantComposer
          attachments={attachments}
          contextAvailable={context !== null}
          disabled={!canSend}
          focusOnMount
          isSending={assistant.isResponding}
          isStopping={assistant.isStopping}
          message={draft}
          onMessageChange={onDraftChange}
          onStop={assistant.canStop ? assistant.stop : undefined}
          onSubmit={assistant.send}
        />
      </div>
    </>
  );
}
