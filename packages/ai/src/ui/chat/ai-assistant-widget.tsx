import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react';
import { assistantConversationContextKey } from '#ai/runtime/screen';
import { AssistantSidechatPanel } from '#ai/ui/chat/assistant-sidechat-panel';
import { type AgentScreen, useCurrentAgentScreen } from '#ai/ui/context/agent-context';
import type { AssistantBackendApi } from '#ai/ui/hooks/assistant-functions';
import { useAssistant } from '#ai/ui/hooks/use-assistant';
import { toggleContextTagReferences, useAssistantChats } from '#ai/ui/hooks/use-assistant-chats';

const SHORTCUT_KEY = '.';

/**
 * The screen the panel was opened on, and the page it showed (`key`, null while it loaded).
 * `screenId` is null when it was opened before any page view mounted.
 */
type ScreenOpening = { key: string | null; screenId: string | null };
type Opening = ScreenOpening | null;

function openingOn(screen: AgentScreen | null): ScreenOpening {
  return { key: screen?.context?.key ?? null, screenId: screen?.id ?? null };
}

/**
 * Leaving the page closes the panel: another page view, or the same view moving to another page
 * (a trip section). An opening made while the page still loaded adopts the page once it does.
 */
function followScreen(opening: Opening, screen: AgentScreen | null): Opening {
  if (!opening) return null;
  const next = openingOn(screen);
  if (opening.screenId === null) return next.screenId === null ? opening : next;
  if (opening.screenId !== next.screenId) return null;
  if (next.key === null || next.key === opening.key) return opening;
  return opening.key === null ? next : null;
}

/** Dispatch this on `window` to open the assistant from anywhere, for example the phone top bar. */
export const OPEN_ASSISTANT_EVENT = 'groam:open-assistant';

/**
 * The private Groam AI panel. It reads the current page's conversation as soon as the page
 * registers its context, so the panel opens on it already loaded; opening it never writes.
 */
export function AiAssistantWidget({ api }: { api: AssistantBackendApi }) {
  const screen = useCurrentAgentScreen();
  const chats = useAssistantChats(api);
  const [storedOpening, setOpening] = useState<Opening>(null);
  const opening = followScreen(storedOpening, screen);
  if (opening !== storedOpening) setOpening(opening);
  const isOpen = opening !== null;
  const openerRef = useRef<HTMLElement>(null);
  const focusOnClose = useRef(false);

  /** User-initiated only: leaving the page closes the panel without moving focus. */
  const setOpen = (open: boolean) => {
    if (open && !isOpen) {
      openerRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
    focusOnClose.current = !open;
    setOpening(open ? (opening ?? openingOn(screen)) : null);
  };

  useLayoutEffect(() => {
    document.documentElement.toggleAttribute('data-ai-sidechat-open', isOpen);
    return () => document.documentElement.removeAttribute('data-ai-sidechat-open');
  }, [isOpen]);

  const onShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (
      !event.repeat &&
      event.key === SHORTCUT_KEY &&
      (event.metaKey || event.ctrlKey) &&
      !event.altKey
    ) {
      event.preventDefault();
      setOpen(!isOpen);
    }
  });
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => onShortcut(event);
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const onOpenRequest = useEffectEvent(() => setOpen(true));
  useEffect(() => {
    const handleOpenRequest = () => onOpenRequest();
    window.addEventListener(OPEN_ASSISTANT_EVENT, handleOpenRequest);
    return () => window.removeEventListener(OPEN_ASSISTANT_EVENT, handleOpenRequest);
  }, []);

  const conversationKey = useConversationScope(screen);

  useEffect(() => {
    if (isOpen) return;
    if (focusOnClose.current) openerRef.current?.focus();
    focusOnClose.current = false;
    openerRef.current = null;
  }, [isOpen]);

  return (
    <ScreenAssistant
      api={api}
      chats={chats}
      isOpen={isOpen}
      // Another page view or conversation starts clean: its draft, sending state, and picked chats.
      key={conversationKey}
      onOpenChange={setOpen}
      screen={screen}
    />
  );
}

/**
 * Changes when the page view or its conversation does, but not while a page loads: a view that
 * registers its first context keeps the scope, so an open panel does not remount.
 */
function useConversationScope(screen: AgentScreen | null): string {
  const screenId = screen?.id ?? null;
  const conversation = screen?.context ? assistantConversationContextKey(screen.context) : null;
  const [scope, setScope] = useState({ conversation, generation: 0, screenId });
  const moved =
    screenId !== scope.screenId ||
    (conversation !== null && scope.conversation !== null && conversation !== scope.conversation);
  if (moved || (conversation !== null && scope.conversation === null)) {
    setScope({ conversation, generation: scope.generation + (moved ? 1 : 0), screenId });
  }
  return String(scope.generation);
}

function ScreenAssistant({
  api,
  chats,
  isOpen,
  onOpenChange,
  screen
}: {
  api: AssistantBackendApi;
  chats: ReturnType<typeof useAssistantChats>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  screen: AgentScreen | null;
}) {
  const context = screen?.context ?? null;
  const assistant = useAssistant(context, api, chats.isLoading ? undefined : chats.chats);
  // One draft per conversation: it survives the first message starting the thread, and only
  // picking another chat clears it.
  const [draft, setDraft] = useState('');
  const selectThread = (threadId: string) => {
    setDraft('');
    assistant.selectThread(threadId);
  };

  if (!isOpen) return null;

  const canSend = Boolean(context && !assistant.isLoading && !assistant.isResponding);
  const startNewChat = async () => {
    if (!context) return;
    const threadId = await chats.createChat(context);
    if (threadId) selectThread(threadId);
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

  return (
    <AssistantSidechatPanel
      assistant={{ ...assistant, selectThread }}
      attachments={attachments}
      canSend={canSend}
      chats={chats}
      context={context}
      contextChats={contextChats}
      draft={draft}
      onClose={() => onOpenChange(false)}
      onDraftChange={setDraft}
      onStartNew={startNewChat}
    />
  );
}
