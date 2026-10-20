import { ArrowUp, Paperclip, SendHorizontal, X } from '@groam/icons';
import { cn } from '@groam/ui/lib/utils';
import { type ReactNode, useRef, useState } from 'react';
import { Button } from './button';
import { RichTextEditor, type RichTextEditorHandle } from './rich-text-editor';
import { Spinner } from './spinner';

const MAX_MESSAGE_LENGTH = 5_000;
const SEND_CONTROL = {
  inline: { className: 'rounded-full', Icon: SendHorizontal, variant: 'default' },
  stacked: { className: 'rounded-lg text-muted-foreground', Icon: ArrowUp, variant: 'ghost' }
} as const;

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
  layout?: 'inline' | 'stacked';
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
  layout = 'inline',
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
  const editorRef = useRef<RichTextEditorHandle>(null);
  const buttonLabel = submitLabel ?? (compact ? 'Reply' : 'Send');
  const sendControl = SEND_CONTROL[layout];
  const SubmitIcon = sendControl.Icon;
  const canSubmit = text.trim().length > 0 || allowEmptySubmit;

  const api: MessageComposerApi = {
    insertText: (value) => {
      const editor = editorRef.current;
      if (editor) editor.insertText(value);
      else setText((current) => `${current}${value}`.slice(0, MAX_MESSAGE_LENGTH));
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
      className={cn(
        'flex flex-col gap-2',
        layout === 'stacked' &&
          'rounded-2xl border border-input bg-background p-2 focus-within:border-ring transition-colors motion-reduce:transition-none'
      )}
      data-testid={testId}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      {attachments}
      {resolveSlot(beforeInput, api)}
      <div className={cn('flex items-end gap-1', layout === 'stacked' && 'flex-wrap')}>
        <div
          className={cn(
            'min-w-0 px-3.5 py-2',
            layout === 'stacked'
              ? 'order-1 basis-full'
              : 'order-2 flex-1 rounded-2xl border border-border/80 bg-background focus-within:border-foreground/25'
          )}
        >
          <RichTextEditor
            maxLength={MAX_MESSAGE_LENGTH}
            aria-label={label}
            autoFocus={autoFocus}
            contentClassName={cn(
              'max-h-32 overflow-y-auto text-[15px]',
              layout === 'stacked' ? 'min-h-12 leading-6' : 'min-h-5 leading-5'
            )}
            disabled={isSubmitting}
            onChange={(value) => setText(value.slice(0, MAX_MESSAGE_LENGTH))}
            onSubmit={() => void submit()}
            placeholder={placeholder}
            ref={editorRef}
            submitShortcut={submitShortcut}
            testId={testId ? `${testId}-input` : undefined}
            value={text}
            variant="bare"
          />
          {text.length > 4_500 && (
            <p className="pt-1 text-right text-[10px] text-muted-foreground">
              {text.length.toLocaleString()} / 5,000
            </p>
          )}
        </div>

        <div
          className={cn(
            'flex shrink-0 items-center gap-0.5 pb-0.5',
            layout === 'stacked' ? 'order-2 flex-1' : 'order-1'
          )}
        >
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
              {/* The button above opens this picker; hidden so assistive tech hears one control. */}
              <input
                accept={fileAccept}
                hidden
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

        <div className="order-3 flex shrink-0 items-center pb-0.5">
          <Button
            aria-label={buttonLabel}
            className={cn('size-9 touch-manipulation', sendControl.className)}
            disabled={isSubmitting || !canSubmit}
            size="icon"
            title={buttonLabel}
            type="submit"
            variant={sendControl.variant}
          >
            {isSubmitting ? <Spinner /> : <SubmitIcon className="size-4" />}
          </Button>
        </div>
      </div>
    </form>
  );
}
