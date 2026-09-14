import { assistantConversationContextKey } from '@groam/ai-contracts/agents/screen';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAssistant } from '#src/ai/hooks/use-assistant';
import { toggleContextTagReferences, useAssistantChats } from '#src/ai/hooks/use-assistant-chats';
import { AssistantSidechatPanel } from '#tsx/ai/chat/assistant-sidechat-panel';
import { AssistantSidechatRail } from '#tsx/ai/chat/assistant-sidechat-rail';
import { type AgentScreenContext, useCurrentAgentContext } from '#tsx/ai/context/agent-context';

const SHORTCUT_KEY = '.';

export function AiAssistantWidget() {
  const context = useCurrentAgentContext();
  return <ContextualAssistantWidget context={context} key={context?.key ?? 'no-context'} />;
}

function ContextualAssistantWidget({ context }: { context: AgentScreenContext | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const assistant = useAssistant(context, { enabled: isOpen });
  const chats = useAssistantChats(isOpen);
  const hasInteracted = useRef(false);
  const openAttempted = useRef(false);
  const wasOpen = useRef(false);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const setOpen = useCallback((open: boolean) => {
    hasInteracted.current = true;
    setIsOpen(open);
  }, []);

  useLayoutEffect(() => {
    document.documentElement.toggleAttribute('data-ai-sidechat-open', isOpen);
    return () => document.documentElement.removeAttribute('data-ai-sidechat-open');
  }, [isOpen]);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if (
        !event.repeat &&
        event.key === SHORTCUT_KEY &&
        (event.metaKey || event.ctrlKey) &&
        !event.altKey
      ) {
        event.preventDefault();
        setOpen(!isOpen);
      }
    };
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, [isOpen, setOpen]);

  useEffect(() => {
    const onOpenRequest = () => setOpen(true);
    window.addEventListener('groam:open-assistant', onOpenRequest);
    return () => window.removeEventListener('groam:open-assistant', onOpenRequest);
  }, [setOpen]);

  useEffect(() => {
    if (wasOpen.current && !isOpen && hasInteracted.current) launcherRef.current?.focus();
    wasOpen.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      openAttempted.current = false;
      return;
    }
    if (!context || assistant.threadId || openAttempted.current) return;
    openAttempted.current = true;
    void assistant.open();
  }, [assistant.open, assistant.threadId, context, isOpen]);

  useEffect(() => {
    openAttempted.current = false;
  }, []);

  const canSend = Boolean(context && assistant.threadId && !assistant.isResponding);
  const startNewChat = async () => {
    if (!context) return;
    const threadId = await chats.createChat(context);
    if (threadId) assistant.selectThread(threadId);
  };
  const activeChat = chats.chats.find((chat) => chat.id === assistant.threadId);
  const contextKey = context ? assistantConversationContextKey(context) : null;
  const contextChats = chats.chats.filter((chat) => chat.contextKey === contextKey);
  const attachments = activeChat
    ? {
        catalog: chats.catalog,
        disabled: assistant.isResponding || chats.updatingThreadId === activeChat.id,
        onChange: (
          reference: { id: string; kind: 'activity' | 'destination' | 'trip' },
          checked: boolean
        ) => {
          void chats.setTags(
            activeChat.id,
            toggleContextTagReferences(activeChat.tags, reference, checked)
          );
        },
        tags: activeChat.tags
      }
    : undefined;

  if (!isOpen) {
    return (
      <AssistantSidechatRail
        isResponding={assistant.isResponding}
        onOpen={() => setOpen(true)}
        ref={launcherRef}
      />
    );
  }

  return (
    <AssistantSidechatPanel
      assistant={assistant}
      attachments={attachments}
      canSend={canSend}
      chats={chats}
      context={context}
      contextChats={contextChats}
      onClose={() => setOpen(false)}
      onStartNew={startNewChat}
    />
  );
}
