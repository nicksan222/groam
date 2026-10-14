import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore
} from 'react';
import { assistantConversationContextKey } from '#ai/runtime/screen';
import { AssistantSidechatPanel } from '#ai/ui/chat/assistant-sidechat-panel';
import { AssistantSidechatRail } from '#ai/ui/chat/assistant-sidechat-rail';
import { type AgentScreenContext, useCurrentAgentContext } from '#ai/ui/context/agent-context';
import type { AssistantBackendApi } from '#ai/ui/hooks/assistant-functions';
import { useAssistant } from '#ai/ui/hooks/use-assistant';
import { toggleContextTagReferences, useAssistantChats } from '#ai/ui/hooks/use-assistant-chats';

const SHORTCUT_KEY = '.';
const DOCKED_MEDIA_QUERY = '(min-width: 1280px)';

function subscribeToDockedViewport(onChange: () => void) {
  const mediaQuery = window.matchMedia(DOCKED_MEDIA_QUERY);
  mediaQuery.addEventListener('change', onChange);
  return () => mediaQuery.removeEventListener('change', onChange);
}

function isDockedViewport() {
  return window.matchMedia(DOCKED_MEDIA_QUERY).matches;
}

export function AiAssistantWidget({
  api,
  showMobileLauncher = true
}: {
  api: AssistantBackendApi;
  showMobileLauncher?: boolean;
}) {
  const context = useCurrentAgentContext();
  return (
    <ContextualAssistantWidget
      api={api}
      context={context}
      key={context?.key ?? 'no-context'}
      showMobileLauncher={showMobileLauncher}
    />
  );
}

function ContextualAssistantWidget({
  api,
  context,
  showMobileLauncher
}: {
  api: AssistantBackendApi;
  context: AgentScreenContext | null;
  showMobileLauncher: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftState, setDraftState] = useState<{ draft: string; threadId: string | null }>({
    draft: '',
    threadId: null
  });
  const isDocked = useSyncExternalStore(subscribeToDockedViewport, isDockedViewport, () => false);
  const assistant = useAssistant(context, api, { enabled: isOpen });
  const chats = useAssistantChats(api, isOpen);
  const hasInteracted = useRef(false);
  const openAttempted = useRef(false);
  const wasOpen = useRef(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const externalLauncherRef = useRef<HTMLElement>(null);

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
    const onOpenRequest = () => {
      externalLauncherRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setOpen(true);
    };
    window.addEventListener('groam:open-assistant', onOpenRequest);
    return () => window.removeEventListener('groam:open-assistant', onOpenRequest);
  }, [setOpen]);

  useEffect(() => {
    if (wasOpen.current && !isOpen && hasInteracted.current) {
      (launcherRef.current ?? externalLauncherRef.current)?.focus();
      externalLauncherRef.current = null;
    }
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
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- depends on the members it reads, not the whole assistant object
  }, [assistant.open, assistant.threadId, context, isOpen]);

  useEffect(() => {
    openAttempted.current = false;
  }, []);

  const draft = draftState.threadId === assistant.threadId ? draftState.draft : '';
  const setDraft = (nextDraft: string) => {
    setDraftState({ draft: nextDraft, threadId: assistant.threadId });
  };

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
        showMobileLauncher={showMobileLauncher}
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
      draft={draft}
      isDocked={isDocked}
      onClose={() => setOpen(false)}
      onDraftChange={setDraft}
      onStartNew={startNewChat}
    />
  );
}
