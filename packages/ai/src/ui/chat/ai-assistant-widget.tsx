import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore
} from 'react';
import { assistantConversationContextKey } from '#ai/runtime/screen';
import { AssistantSidechatPanel } from '#ai/ui/chat/assistant-sidechat-panel';
import { AssistantSidechatRail } from '#ai/ui/chat/assistant-sidechat-rail';
import { useCurrentAgentContext } from '#ai/ui/context/agent-context';
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
  const pageKey = context?.key ?? null;
  // The page the panel was opened on, or undefined while closed. An opening made before any
  // page registers adopts the first page; leaving that page closes the panel in this render,
  // so the assistant never starts a thread for the next page.
  const [openedOn, setOpenedOn] = useState<string | null>();
  if (openedOn !== undefined && openedOn !== pageKey) {
    setOpenedOn(openedOn === null ? pageKey : undefined);
  }
  const isOpen = openedOn === null || openedOn === pageKey;
  const [draftState, setDraftState] = useState<{ draft: string; threadId: string | null }>({
    draft: '',
    threadId: null
  });
  const isDocked = useSyncExternalStore(subscribeToDockedViewport, isDockedViewport, () => false);
  const assistant = useAssistant(context, api, { enabled: isOpen });
  const chats = useAssistantChats(api, isOpen);
  const hasInteracted = useRef(false);
  const openAttempted = useRef(false);
  const [openFailed, setOpenFailed] = useState(false);
  const wasOpen = useRef(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const externalLauncherRef = useRef<HTMLElement>(null);

  const setOpen = (open: boolean) => {
    hasInteracted.current = true;
    setOpenedOn(open ? pageKey : undefined);
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

  const onOpenRequest = useEffectEvent(() => {
    externalLauncherRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(true);
  });
  useEffect(() => {
    const handleOpenRequest = () => onOpenRequest();
    window.addEventListener('groam:open-assistant', handleOpenRequest);
    return () => window.removeEventListener('groam:open-assistant', handleOpenRequest);
  }, []);

  useEffect(() => {
    if (wasOpen.current && !isOpen && hasInteracted.current) {
      (launcherRef.current ?? externalLauncherRef.current)?.focus();
      externalLauncherRef.current = null;
    }
    wasOpen.current = isOpen;
  }, [isOpen]);

  const attemptOpen = () => {
    setOpenFailed(false);
    return assistant.open().then((opened) => {
      if (opened === false) setOpenFailed(true);
    });
  };

  useEffect(() => {
    if (!isOpen) {
      openAttempted.current = false;
      setOpenFailed(false);
      return;
    }
    if (!context || assistant.threadId || openAttempted.current) return;
    openAttempted.current = true;
    void attemptOpen();
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- depends on the members it reads, not the whole assistant object
  }, [assistant.open, assistant.threadId, context, isOpen]);

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
      onRetryOpen={() => void attemptOpen()}
      onStartNew={startNewChat}
      openFailed={openFailed && !assistant.threadId}
    />
  );
}
