import {
  Composer,
  ComposerActionGroup,
  ComposerActions,
  ComposerInput,
  type ComposerValue,
  getComposerText
} from '@groam/ui/components/composer';
import { cn } from '@groam/ui/lib/utils';
import { type ReactNode, type RefObject, useEffect, useRef, useState } from 'react';
import {
  AssistantAttachmentChips,
  AssistantAttachmentPicker,
  type AssistantAttachments
} from '#ai/ui/attachments/assistant-attachments';
import { AssistantComposerSend } from './assistant-composer-send';

const COMPOSER_LABEL = 'Assistant prompt';
const DEFAULT_MAX_LENGTH = 800;

export type AssistantComposerProps = {
  attachments?: AssistantAttachments;
  contextAvailable: boolean;
  disabled: boolean;
  focusOnMount?: boolean;
  isSending: boolean;
  isStopping?: boolean;
  maxLength?: number;
  message?: string;
  onMessageChange?: (message: string) => void;
  onStop?: () => Promise<boolean>;
  onSubmit: (prompt: string) => Promise<boolean>;
  variant?: 'default' | 'sidechat';
};

/** The assistant prompt box on the coss Composer: Enter sends, Shift+Enter adds a line. */
export function AssistantComposer({
  attachments,
  contextAvailable,
  disabled,
  focusOnMount = false,
  isSending,
  isStopping = false,
  maxLength = DEFAULT_MAX_LENGTH,
  message,
  onMessageChange,
  onStop,
  onSubmit,
  variant = 'sidechat'
}: AssistantComposerProps) {
  const composer = useAssistantComposer({
    disabled,
    focusOnMount,
    maxLength,
    message,
    onMessageChange,
    onSubmit
  });
  const sidechat = variant === 'sidechat';
  return (
    <div
      className={cn(
        'shrink-0',
        sidechat
          ? 'mx-3 mt-1 mb-[calc(0.75rem+env(safe-area-inset-bottom))]'
          : 'bg-background px-3 pt-1 pb-[calc(0.5rem+env(safe-area-inset-bottom))]'
      )}
      data-variant={variant}
    >
      <Composer
        aria-label={COMPOSER_LABEL}
        className={cn(
          'assistant-composer [--composer-max-rows:6]',
          sidechat && 'bg-card [--composer-radius:var(--radius-2xl)]'
        )}
        disabled={disabled}
        onSubmit={(value) => void composer.submit(value)}
        onValueChange={composer.change}
        submitOnEnter="always"
        value={composer.value}
      >
        {attachments ? <AssistantChipsSlot attachments={attachments} /> : null}
        <ComposerInput
          aria-label={COMPOSER_LABEL}
          className="text-sm leading-5"
          placeholder={composerPlaceholder(contextAvailable, isSending)}
          ref={composer.inputRef}
        />
        <ComposerActions>
          <ComposerActionGroup align="start">
            {attachments ? <AssistantAttachmentPicker attachments={attachments} /> : null}
          </ComposerActionGroup>
          <ComposerActionGroup align="end">
            <AssistantComposerSend
              isResponding={isSending}
              isStopping={isStopping}
              onStop={onStop}
              variant={variant}
            />
          </ComposerActionGroup>
        </ComposerActions>
      </Composer>
      <ComposerNotice variant={variant}>AI can make mistakes.</ComposerNotice>
    </div>
  );
}

function AssistantChipsSlot({ attachments }: { attachments: AssistantAttachments }) {
  return (
    <div className="px-2 empty:hidden">
      <AssistantAttachmentChips attachments={attachments} />
    </div>
  );
}

function ComposerNotice({
  children,
  variant
}: {
  children: ReactNode;
  variant: 'default' | 'sidechat';
}) {
  return (
    <p
      className={
        variant === 'sidechat'
          ? 'px-2 pt-1 text-[10px] text-muted-foreground'
          : 'pt-1 text-center text-[10px] text-muted-foreground'
      }
    >
      {children}
    </p>
  );
}

function useAssistantComposer({
  disabled,
  focusOnMount,
  maxLength,
  message,
  onMessageChange,
  onSubmit
}: {
  disabled: boolean;
  focusOnMount: boolean;
  maxLength: number;
  message?: string;
  onMessageChange?: (message: string) => void;
  onSubmit: (prompt: string) => Promise<boolean>;
}) {
  const [uncontrolledMessage, setUncontrolledMessage] = useState('');
  const text = message ?? uncontrolledMessage;
  const setText = onMessageChange ?? setUncontrolledMessage;
  const inputRef = useRef<HTMLDivElement>(null);
  useFocusOnMount(inputRef, disabled, focusOnMount);

  const submit = async (value: ComposerValue) => {
    const normalized = getComposerText(value).trim();
    if (!normalized || disabled) return;
    setText('');
    if (!(await onSubmit(normalized))) setText(normalized);
  };
  return {
    change: (value: ComposerValue) => setText(getComposerText(value).slice(0, maxLength)),
    inputRef,
    submit,
    value: composerValue(text)
  };
}

function useFocusOnMount(
  inputRef: RefObject<HTMLDivElement | null>,
  disabled: boolean,
  focusOnMount: boolean
) {
  useEffect(() => {
    if (focusOnMount && !disabled) inputRef.current?.focus();
  }, [disabled, focusOnMount, inputRef]);
}

function composerValue(text: string): ComposerValue {
  return text ? [{ text, type: 'text' }] : [];
}

function composerPlaceholder(contextAvailable: boolean, isSending: boolean): string {
  if (!contextAvailable) return 'Waiting for this page…';
  return isSending ? 'Groam is responding…' : 'Message Groam…';
}
