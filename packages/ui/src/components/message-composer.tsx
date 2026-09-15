import { cn } from '@groam/ui/lib/utils';
import { Paperclip, SendHorizontal, X } from 'lucide-react';
import { type ReactNode, useRef, useState } from 'react';
import { Button } from './button';
import { Spinner } from './spinner';
import { Textarea } from './textarea';

const MAX_MESSAGE_LENGTH = 5_000;

export type MessageComposerApi = {
  insertText: (value: string) => void;
  isSubmitting: boolean;
  setText: (value: string) => void;
  text: string;
};

export type ComposerSlot = ReactNode | ((api: MessageComposerApi) => ReactNode);

export type MessageComposerProps = {
  allowEmptySubmit?: boolean;
  attachments?: ReactNode;
  autoFocus?: boolean;
  beforeInput?: ComposerSlot;
  clearOnSubmit?: 'immediate' | 'success';
  compact?: boolean;
  fileAccept?: string;
  label: string;
  onAttachFiles?: (files: File[]) => void;
  onCancel?: () => void;
  onSubmit: (text: string) => Promise<boolean>;
  placeholder?: string;
  submitLabel?: string;
  submitShortcut?: 'enter' | 'mod-enter';
  testId?: string;
  toolbarStart?: ComposerSlot;
};

function resolveSlot(slot: ComposerSlot | undefined, api: MessageComposerApi): ReactNode {
  if (slot === undefined) return null;
  return typeof slot === 'function' ? slot(api) : slot;
}

export function MessageComposer({
  allowEmptySubmit = false,
  attachments,
  autoFocus = false,
  beforeInput,
  clearOnSubmit = 'success',
  compact = false,
  fileAccept,
  label,
  onAttachFiles,
  onCancel,
  onSubmit,
  placeholder = 'Share an update, question, or idea…',
  submitLabel,
  submitShortcut = 'mod-enter',
  testId,
  toolbarStart
}: MessageComposerProps) {
  const [text, setText] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const buttonLabel = submitLabel ?? (compact ? 'Reply' : 'Send');
  const canSubmit = text.trim().length > 0 || allowEmptySubmit;

  const api: MessageComposerApi = {
    insertText: (value) => {
      const input = textareaRef.current;
      if (!input) {
        setText((current) => `${current}${value}`);
        return;
      }
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? start;
      const next = `${input.value.slice(0, start)}${value}${input.value.slice(end)}`;
      setText(next.slice(0, MAX_MESSAGE_LENGTH));
      requestAnimationFrame(() => {
        const caret = Math.min(start + value.length, MAX_MESSAGE_LENGTH);
        input.focus();
        input.setSelectionRange(caret, caret);
      });
    },
    isSubmitting,
    setText: (value) => setText(value.slice(0, MAX_MESSAGE_LENGTH)),
    text
  };

  const submit = async () => {
    const message = text.trim();
    if ((!message && !allowEmptySubmit) || isSubmitting) return;
    if (clearOnSubmit === 'immediate') setText('');
    setSubmitting(true);
    try {
      const sent = await onSubmit(message);
      if (sent) setText('');
      else if (clearOnSubmit === 'immediate') setText(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      aria-label={label}
      className="flex flex-col gap-2"
      data-testid={testId}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      {attachments}
      {resolveSlot(beforeInput, api)}
      <div className="flex items-end gap-1">
        <div className="flex shrink-0 items-center gap-0.5 pb-0.5">
          {onAttachFiles && (
            <>
              <Button
                aria-label="Attach files"
                className="size-9 touch-manipulation rounded-full"
                disabled={isSubmitting}
                onClick={() => fileInputRef.current?.click()}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Paperclip className="size-[1.125rem]" />
              </Button>
              <input
                accept={fileAccept}
                aria-label="Attach files"
                className="sr-only"
                multiple
                onChange={(event) => {
                  const files = [...(event.target.files ?? [])];
                  event.target.value = '';
                  if (files.length > 0) onAttachFiles(files);
                }}
                ref={fileInputRef}
                type="file"
              />
            </>
          )}
          {resolveSlot(toolbarStart, api)}
          {onCancel ? (
            <Button
              aria-label="Cancel reply"
              className="size-9 touch-manipulation rounded-full"
              disabled={isSubmitting}
              onClick={onCancel}
              size="icon"
              type="button"
              variant="ghost"
            >
              <X className="size-[1.125rem]" />
            </Button>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 rounded-2xl border border-border/80 bg-background px-3.5 py-2 focus-within:border-foreground/25">
          <Textarea
            aria-label={label}
            autoFocus={autoFocus}
            className={cn(
              'max-h-32 w-full field-sizing-content resize-none border-0 bg-transparent p-0 text-[15px] leading-5 shadow-none focus-visible:ring-0 dark:bg-transparent',
              compact ? 'min-h-5' : 'min-h-5'
            )}
            data-testid={testId ? `${testId}-input` : undefined}
            disabled={isSubmitting}
            maxLength={MAX_MESSAGE_LENGTH}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              const shouldSubmit =
                event.key === 'Enter' &&
                (submitShortcut === 'enter' ? !event.shiftKey : event.metaKey || event.ctrlKey);
              if (!shouldSubmit) return;
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }}
            placeholder={placeholder}
            ref={textareaRef}
            rows={1}
            value={text}
          />
          {text.length > 4_500 && (
            <p className="pt-1 text-right text-[10px] text-muted-foreground">
              {text.length.toLocaleString()} / 5,000
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center pb-0.5">
          <Button
            aria-label={buttonLabel}
            className="size-9 touch-manipulation rounded-full"
            disabled={isSubmitting || !canSubmit}
            size="icon"
            title={buttonLabel}
            type="submit"
          >
            {isSubmitting ? <Spinner /> : <SendHorizontal className="size-[1.125rem]" />}
          </Button>
        </div>
      </div>
    </form>
  );
}
