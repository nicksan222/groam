import { Button } from '@groam/ui/components/button';
import { Form } from '@groam/ui/components/form';
import { FormActions } from '@groam/ui/components/form-actions';
import { FormFeedback } from '@groam/ui/components/form-feedback';
import { Label } from '@groam/ui/components/label';
import { RichTextEditor } from '@groam/ui/components/rich-text-editor';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
import { draftAfterSend } from '@groam/ui/lib/draft';
import { cn } from '@groam/ui/lib/utils';
import { type ReactNode, useId, useState } from 'react';

/** A second way to send the same text, e.g. "Request changes" beside "Comment". */
// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type ComposerAlternative = {
  label: string;
  onSubmit: (content: string) => Promise<unknown>;
  /** Send this way on Mod+Enter, when it is the gentler action (Comment beside Request changes). */
  shortcut?: boolean;
  testId?: string;
};

/**
 * Write a comment or reply and send it. The editor stays editable while sending; once
 * `onSubmit` succeeds the draft clears unless more was typed meanwhile. Resolve `false` or
 * `null` when the send failed and was already reported (a toast), to keep the text; a throw
 * shows its message under the editor.
 */
export type CommentComposerProps = {
  alternative?: ComposerAlternative;
  autoFocus?: boolean;
  className?: string;
  disabled?: boolean;
  /** Quiet copy beside the buttons. */
  hint?: ReactNode;
  /** Accessible name of the editor; also its visible label when `showLabel`. */
  label: string;
  maxLength?: number;
  onCancel?: () => void;
  onSubmit: (content: string) => Promise<unknown>;
  placeholder: string;
  showLabel?: boolean;
  submitLabel: string;
  submitTestId?: string;
  /** `card` frames the editor with a toolbar and a footer bar; `plain` sits in an open area. */
  surface?: 'card' | 'plain';
  testId?: string;
};

/**
 * Draft + sending state shared by both buttons: clears the draft once a send succeeds and
 * remembers which button sent, so only that one shows a spinner.
 */
function useCommentSend() {
  const [draft, setDraft] = useState('');
  const [via, setVia] = useState<'alternative' | 'primary'>('primary');
  const form = useFormSubmit({ fallbackError: 'Your comment wasn’t saved. Try again.' });
  const empty = draft.trim().length === 0;
  const send = (sender: typeof via, handler: (content: string) => Promise<unknown>) => {
    const typed = draft;
    // While one send runs, another press must not move the spinner to its button.
    if (empty || form.isPending) return;
    setVia(sender);
    void form.run(async () => {
      const result = await handler(typed.trim());
      // Keep whatever was typed while it was sending.
      if (result !== false && result !== null)
        setDraft((current) => draftAfterSend(current, typed));
    });
  };
  return {
    draft,
    empty,
    error: form.error,
    isPending: form.isPending,
    pendingVia: form.isPending ? via : null,
    send,
    setDraft
  };
}

/** Characters used, shown only once the draft nears its limit, like FormField's counter. */
function ComposerCounter({
  inset,
  length,
  maxLength
}: {
  inset: boolean;
  length: number;
  maxLength?: number;
}) {
  if (maxLength === undefined || length < maxLength * 0.8) return null;
  return (
    <p
      aria-live="polite"
      className={cn('text-right text-xs text-muted-foreground tabular-nums', inset && 'px-3 pb-2')}
    >
      {length}/{maxLength}
    </p>
  );
}

/** The one composer for comments, replies, and review feedback. */
function CommentComposer({
  alternative,
  autoFocus = false,
  className,
  disabled = false,
  hint,
  label,
  maxLength,
  onCancel,
  onSubmit,
  placeholder,
  showLabel = false,
  submitLabel,
  submitTestId,
  surface = 'card',
  testId
}: CommentComposerProps) {
  const id = useId();
  const composer = useCommentSend();
  const blocked = disabled || composer.isPending;
  const card = surface === 'card';
  const sendPrimary = () => composer.send('primary', onSubmit);
  const sendShortcut = () =>
    alternative?.shortcut ? composer.send('alternative', alternative.onSubmit) : sendPrimary();

  return (
    <Form
      actions={
        <FormActions
          className={card ? 'border-t border-border bg-muted/25 px-3 py-2' : undefined}
          hint={hint}
          isPending={composer.pendingVia === 'primary'}
          onCancel={onCancel}
          size="sm"
          submitDisabled={blocked || composer.empty}
          submitLabel={submitLabel}
          submitTestId={submitTestId}
        >
          {alternative ? (
            <Button
              data-testid={alternative.testId}
              disabled={blocked || composer.empty}
              onClick={() => composer.send('alternative', alternative.onSubmit)}
              pending={composer.pendingVia === 'alternative'}
              size="sm"
              variant="outline"
            >
              {alternative.label}
            </Button>
          ) : null}
        </FormActions>
      }
      className={cn(
        card ? 'gap-0 overflow-hidden rounded-md border border-border bg-background' : 'gap-2',
        className
      )}
      isPending={composer.isPending}
      onSubmit={(event) => {
        event.preventDefault();
        sendPrimary();
      }}
    >
      {showLabel ? (
        <Label className="leading-5" htmlFor={id}>
          {label}
        </Label>
      ) : null}
      <RichTextEditor
        aria-label={label}
        autoFocus={autoFocus}
        contentClassName={card ? 'min-h-24 px-3 py-3' : 'min-h-16'}
        disabled={disabled}
        id={id}
        maxLength={maxLength}
        onChange={composer.setDraft}
        onSubmit={sendShortcut}
        placeholder={placeholder}
        testId={testId}
        toolbar={card}
        value={composer.draft}
        variant={card ? 'bare' : 'field'}
      />
      <ComposerCounter inset={card} length={composer.draft.length} maxLength={maxLength} />
      <FormFeedback className={card ? 'px-3 pb-2' : undefined} error={composer.error} />
    </Form>
  );
}

export { CommentComposer };
