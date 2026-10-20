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

const DEFAULT_SIDECHAT_WIDTH = '24rem';
const WIDE_SIDECHAT_WIDTH = '40rem';

export type AssistantSidechatPanelProps = {
  assistant: ReturnType<typeof useAssistant>;
  attachments: AssistantAttachments | undefined;
  canSend: boolean;
  chats: ReturnType<typeof useAssistantChats>;
  contextChats: ReturnType<typeof useAssistantChats>['chats'];
  context: AgentScreenContext | null;
  draft: string;
  isDocked: boolean;
  onClose: () => void;
  onDraftChange: (draft: string) => void;
  onRetryOpen: () => void;
  onStartNew: () => Promise<void>;
  /** Starting the thread failed; show an inline retry instead of a dead composer. */
  openFailed: boolean;
};

export function AssistantSidechatPanel(props: AssistantSidechatPanelProps) {
  const [isWide, setIsWide] = useState(false);
  const width = props.isDocked && isWide ? WIDE_SIDECHAT_WIDTH : DEFAULT_SIDECHAT_WIDTH;
  const content = (
    <PanelContent
      {...props}
      isWide={isWide}
      onToggleWidth={() => setIsWide((current) => !current)}
    />
  );

  if (!props.isDocked) {
    return (
      <Sheet
        onOpenChange={(open) => {
          if (!open) props.onClose();
        }}
        open
      >
        <SheetContent
          aria-describedby={undefined}
          className="ai-assistant-widget-panel h-dvh w-full gap-0 bg-background p-0 text-foreground sm:max-w-(--ai-sidechat-width)"
          hideCloseButton
          id="ai-assistant-widget"
          style={{ '--ai-sidechat-width': width } as CSSProperties}
        >
          <SheetTitle className="sr-only">Groam AI</SheetTitle>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <section
      aria-labelledby="ai-assistant-widget-title"
      className="ai-assistant-widget-panel relative z-20 flex h-dvh w-(--ai-sidechat-width) max-w-[min(40rem,40vw)] shrink-0 flex-col border-l border-border bg-background text-foreground transition-[width] duration-200 motion-reduce:transition-none"
      id="ai-assistant-widget"
      style={{ '--ai-sidechat-width': width } as CSSProperties}
    >
      {content}
    </section>
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
  isDocked,
  isWide,
  onClose,
  onDraftChange,
  onRetryOpen,
  onStartNew,
  onToggleWidth,
  openFailed
}: AssistantSidechatPanelProps & {
  isWide: boolean;
  onToggleWidth: () => void;
}) {
  useEffect(() => {
    if (!isWide || assistant.messages.length > 0) return;
    const frame = requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>('#ai-assistant-widget [data-slot="message-scroller-viewport"]')
        ?.scrollTo({ top: 0 });
    });
    return () => cancelAnimationFrame(frame);
  }, [assistant.messages.length, isWide]);

  const activeChat = contextChats.find((chat) => chat.id === assistant.threadId);
  const conversationTitle = activeChat?.title.trim() || 'Groam AI';

  return (
    <>
      <header className="flex min-h-14 shrink-0 items-center gap-1 border-b border-border px-2 sm:px-3">
        <AssistantChatMenu
          activeChatId={assistant.threadId}
          chats={contextChats}
          disabled={assistant.isResponding || chats.isLoading}
          onSelect={assistant.selectThread}
          title={conversationTitle}
        />
        <span className="ml-auto flex shrink-0 items-center gap-0.5">
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
          {isDocked ? (
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
          ) : null}
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
          isOpening={assistant.isOpening}
          isSending={assistant.isResponding}
          loadMore={assistant.loadMore}
          messages={assistant.messages}
          onReply={assistant.send}
          onResend={assistant.resend}
          status={assistant.status}
          unavailable={!assistant.threadId}
        />
        {openFailed ? (
          <div
            className="flex items-center justify-between gap-2 border-t border-border px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            <span>Groam AI could not start.</span>
            <Button onClick={onRetryOpen} size="sm" type="button" variant="outline">
              Retry
            </Button>
          </div>
        ) : null}
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
          key={assistant.threadId}
          message={draft}
          onMessageChange={onDraftChange}
          onStop={assistant.canStop ? assistant.stop : undefined}
          onSubmit={assistant.send}
        />
      </div>
    </>
  );
}
