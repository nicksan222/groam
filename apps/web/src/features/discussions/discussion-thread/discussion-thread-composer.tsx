import {
  Composer,
  ComposerActionGroup,
  ComposerActions,
  ComposerInput,
  type ComposerItemValue,
  ComposerSend,
  ComposerStop,
  type ComposerTrigger,
  type ComposerValue,
  getComposerText
} from '@groam/ui/components/composer';
import { toast } from '@groam/ui/components/toast';
import { useAsyncAction } from '@groam/ui/hooks/use-async-action';
import { useEffect, useMemo, useRef, useState } from 'react';
import { agentMentionTrigger } from '@/features/discussions/agent-mention-controls/agent-mention';
import { AskGroamButton } from '@/features/discussions/agent-mention-controls/ask-groam-button';
import {
  type ComposerCommand,
  commandSuggestions,
  commandTrigger,
  resolveCommandSubmit
} from '@/features/discussions/composer-commands/composer-command';
import { ComposerCommandButton } from '@/features/discussions/composer-commands/composer-command-button';
import type { DiscussionSendInput } from '@/features/discussions/hooks/use-discussion-thread';
import { testIds } from '@/lib/test-ids';
import { afterComposerPopupCloses, focusComposerEnd } from './composer-caret';
import { DiscussionAttachButton } from './discussion-attach-button';
import { DiscussionComposerSuggestions } from './discussion-composer-suggestions';
import { DiscussionPendingAttachmentList } from './discussion-pending-attachment-list';
import {
  appendPendingAttachments,
  type PendingAttachment,
  revokePendingAttachmentUrls
} from './discussion-pending-attachments';

const NO_COMMANDS: ComposerCommand[] = [];
const MAX_MESSAGE_LENGTH = 5_000;
const LENGTH_WARNING = 4_500;

export function DiscussionThreadComposer({
  canStop,
  commands = NO_COMMANDS,
  isStopping,
  onSend,
  onStop
}: {
  canStop: boolean;
  /** "/" actions offered in this thread; typed commands run instead of sending. */
  commands?: ComposerCommand[];
  isStopping: boolean;
  onSend: (input: DiscussionSendInput) => Promise<boolean>;
  onStop: () => Promise<boolean>;
}) {
  const [value, setValue] = useState<ComposerValue>([]);
  // `send` reports its own failures (the thread hook toasts), so the guard adds no second toast.
  const submission = useAsyncAction();
  const isSubmitting = submission.isPending;
  const [activeTrigger, setActiveTrigger] = useState<null | string>(null);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const pendingAttachmentsRef = useRef<PendingAttachment[]>([]);
  const inputRef = useRef<HTMLDivElement>(null);
  const text = getComposerText(value);
  const suggestions = useMemo(() => commandSuggestions(commands, text), [commands, text]);
  const triggers = useMemo<ComposerTrigger[]>(
    () =>
      commands.length > 0
        ? [agentMentionTrigger, commandTrigger(suggestions.items)]
        : [agentMentionTrigger],
    [commands.length, suggestions.items]
  );

  useEffect(() => {
    // A touch device would open its keyboard over the conversation (and hide the page's actions).
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, []);

  const setAttachments = (next: PendingAttachment[]) => {
    pendingAttachmentsRef.current = next;
    setPendingAttachments(next);
  };

  const attachFiles = (files: File[]) => {
    const { errors, next } = appendPendingAttachments(pendingAttachmentsRef.current, files);
    for (const error of errors) toast.error(error);
    setAttachments(next);
  };

  const removeAttachment = (id: string) => {
    const current = pendingAttachmentsRef.current;
    const target = current.find((item) => item.id === id);
    if (target) revokePendingAttachmentUrls([target]);
    setAttachments(current.filter((item) => item.id !== id));
  };

  const send = async (message: string) => {
    const command = commands.length > 0 ? resolveCommandSubmit(message, commands) : null;
    if (command) {
      if ('error' in command) {
        toast.error(command.error);
        return false;
      }
      await command.run();
      return true;
    }
    const attachments = pendingAttachmentsRef.current;
    const sent = await onSend({ files: attachments.map((item) => item.file), text: message });
    if (sent) {
      revokePendingAttachmentUrls(attachments);
      setAttachments([]);
    }
    return sent;
  };

  const submit = async (submitted: ComposerValue) => {
    if (isSubmitting) return;
    // Clear at once so the next message can be typed; restore the draft if sending fails.
    setValue([]);
    const outcome = await submission.run(() => send(getComposerText(submitted).trim()));
    // An ignored second Enter changed nothing: the first send owns the draft.
    if (outcome.status === 'ignored') return;
    if (outcome.status === 'error' || !outcome.value) {
      setValue((current) => (current.length === 0 ? submitted : current));
    }
  };

  const runSuggestion = (item: ComposerItemValue) => {
    const action = suggestions.actions.get(item.id);
    if (!action) return;
    if ('run' in action) {
      setValue([]);
      void action.run();
      return;
    }
    setValue([{ text: action.prefill, type: 'text' }]);
    // Place the caret after "/name " once the command list is gone; the choices open from there.
    afterComposerPopupCloses(() => focusComposerEnd(inputRef.current));
  };

  return (
    <div className="safe-bottom w-full shrink-0 bg-background px-3 pt-2 pb-3 sm:px-4 sm:pb-4">
      <Composer
        allowEmpty={pendingAttachments.length > 0}
        aria-label="Message"
        className="mx-auto w-full max-w-3xl [--composer-max-rows:6]"
        data-testid={testIds.chatComposer}
        onAction={runSuggestion}
        onQueryChange={(query) => setActiveTrigger(query?.character ?? null)}
        onSubmit={(submitted) => void submit(submitted)}
        onValueChange={setValue}
        submitDisabled={isSubmitting || text.length > MAX_MESSAGE_LENGTH}
        triggers={triggers}
        value={value}
      >
        {pendingAttachments.length > 0 ? (
          <DiscussionPendingAttachmentList
            attachments={pendingAttachments}
            onRemove={removeAttachment}
          />
        ) : null}
        <ComposerInput
          aria-label="Message"
          data-testid={testIds.chatComposerInput}
          placeholder="Message…"
          ref={inputRef}
        />
        <DiscussionComposerSuggestions trigger={activeTrigger} />
        <ComposerActions>
          <ComposerActionGroup align="start">
            <DiscussionAttachButton disabled={isSubmitting} onFiles={attachFiles} />
            <AskGroamButton disabled={isSubmitting} onValueChange={setValue} />
            {commands.length > 0 ? <ComposerCommandButton /> : null}
          </ComposerActionGroup>
          <ComposerActionGroup align="end">
            {text.length > LENGTH_WARNING ? (
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {text.length.toLocaleString()} / {MAX_MESSAGE_LENGTH.toLocaleString()}
              </span>
            ) : null}
            {canStop ? (
              <ComposerStop label="Stop Groam" onStop={onStop} showLabel stopping={isStopping} />
            ) : null}
            <ComposerSend className="size-9" label="Send message" pending={isSubmitting} />
          </ComposerActionGroup>
        </ComposerActions>
      </Composer>
    </div>
  );
}
