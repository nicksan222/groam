import {
  type RefObject,
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

/** The page the panel was opened on; `firstPage` lets an opening made before any page registers adopt the first one. */
type Opening = { firstPage: boolean; page: string | null } | null;

/** Leaving the page closes the panel, so it never starts a thread for the next page. */
function followPage(opening: Opening, page: string | null): Opening {
  if (!opening || opening.page === page) return opening;
  return opening.page === null && opening.firstPage ? { firstPage: false, page } : null;
}

export function AiAssistantWidget({
  api,
  showMobileLauncher = true
}: {
  api: AssistantBackendApi;
  showMobileLauncher?: boolean;
}) {
  const context = useCurrentAgentContext();
  const page = context?.key ?? null;
  const [storedOpening, setOpening] = useState<Opening>(null);
  const opening = followPage(storedOpening, page);
  if (opening !== storedOpening) setOpening(opening);
  const isOpen = opening !== null;
  const pageSeen = useRef(false);
  const focusOnClose = useRef(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement>(null);

  /** User-initiated only: a page change closes without moving focus. */
  const setOpen = (open: boolean) => {
    focusOnClose.current = !open;
    setOpening(open ? { firstPage: !pageSeen.current, page } : null);
  };

  useEffect(() => {
    if (page !== null) pageSeen.current = true;
  }, [page]);

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
    openerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(true);
  });
  useEffect(() => {
    const handleOpenRequest = () => onOpenRequest();
    window.addEventListener('groam:open-assistant', handleOpenRequest);
    return () => window.removeEventListener('groam:open-assistant', handleOpenRequest);
  }, []);

  useEffect(() => {
    if (isOpen) return;
    if (focusOnClose.current) (launcherRef.current ?? openerRef.current)?.focus();
    focusOnClose.current = false;
    openerRef.current = null;
  }, [isOpen]);

  return (
    <ContextualAssistantWidget
      api={api}
      context={context}
      isOpen={isOpen}
      key={page ?? 'no-context'}
      launcherRef={launcherRef}
      onOpenChange={setOpen}
      showMobileLauncher={showMobileLauncher}
    />
  );
}

function ContextualAssistantWidget({
  api,
  context,
  isOpen,
  launcherRef,
  onOpenChange,
  showMobileLauncher
}: {
  api: AssistantBackendApi;
  context: AgentScreenContext | null;
  isOpen: boolean;
  launcherRef: RefObject<HTMLButtonElement | null>;
  onOpenChange: (open: boolean) => void;
  showMobileLauncher: boolean;
}) {
  const [draftState, setDraftState] = useState<{ draft: string; threadId: string | null }>({
    draft: '',
    threadId: null
  });
  const isDocked = useSyncExternalStore(subscribeToDockedViewport, isDockedViewport, () => false);
  const assistant = useAssistant(context, api, { enabled: isOpen });
  const chats = useAssistantChats(api, isOpen);
  const openAttempted = useRef(false);
  const [openFailed, setOpenFailed] = useState(false);

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
        onOpen={() => onOpenChange(true)}
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
      onClose={() => onOpenChange(false)}
      onDraftChange={setDraft}
      onRetryOpen={() => void attemptOpen()}
      onStartNew={startNewChat}
      openFailed={openFailed && !assistant.threadId}
    />
  );
}
