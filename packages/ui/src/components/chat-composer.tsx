import { SendHorizontal, Square } from 'lucide-react';
import { type FormEvent, type ReactNode, type RefObject, useEffect, useRef, useState } from 'react';
import { Button } from './button';
import { Textarea } from './textarea';

export type ChatComposerProps = {
  beforeInput?: ReactNode;
  disabled: boolean;
  focusOnMount?: boolean;
  isResponding: boolean;
  isStopping?: boolean;
  label: string;
  maxLength?: number;
  message?: string;
  notice: string;
  onMessageChange?: (message: string) => void;
  onStop?: () => Promise<boolean>;
  onSubmit: (message: string) => Promise<boolean>;
  placeholder: string;
  submitLabel?: string;
  toolbarStart?: ReactNode;
  variant?: 'default' | 'sidechat';
};

export function ChatComposer(props: ChatComposerProps) {
  const options = withComposerDefaults(props);
  const composer = useChatComposer(options);
  return (
    <form
      aria-label={options.label}
      className={
        options.variant === 'sidechat'
          ? 'assistant-composer relative mx-3 mt-1 mb-[calc(0.75rem+env(safe-area-inset-bottom))] shrink-0 rounded-2xl border border-border bg-card p-1.5 shadow-xs transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/24'
          : 'assistant-composer relative shrink-0 bg-background px-3 pt-1 pb-[calc(0.5rem+env(safe-area-inset-bottom))]'
      }
      onSubmit={composer.submit}
    >
      {options.beforeInput}
      <div className="relative">
        <Textarea
          aria-label={options.label}
          autoComplete="off"
          className={
            options.variant === 'sidechat'
              ? 'max-h-36 min-h-11 resize-none rounded-xl border-0 bg-transparent px-2.5 pt-2 pb-12 sm:pb-9 text-sm leading-5 shadow-none placeholder:text-muted-foreground focus-visible:ring-0 dark:bg-transparent'
              : 'max-h-36 min-h-11 resize-none rounded-2xl border-input bg-background px-3 pt-2.5 pb-10 text-sm leading-5 shadow-xs/5 placeholder:text-muted-foreground/72 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/24 dark:bg-background'
          }
          disabled={options.disabled}
          maxLength={options.maxLength}
          onChange={(event) => composer.changeMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder={options.placeholder}
          ref={composer.inputRef}
          rows={1}
          value={composer.message}
        />
        <ComposerToolbar
          disabled={options.disabled}
          isResponding={options.isResponding}
          isStopping={options.isStopping}
          message={composer.message}
          onStop={options.onStop}
          submitLabel={options.submitLabel}
          toolbarStart={options.toolbarStart}
          variant={options.variant}
        />
      </div>
      <ComposerNotice notice={options.notice} variant={options.variant} />
    </form>
  );
}

type RequiredComposerOptions = ChatComposerProps & {
  focusOnMount: boolean;
  isStopping: boolean;
  maxLength: number;
  submitLabel: string;
  variant: 'default' | 'sidechat';
};

function withComposerDefaults(props: ChatComposerProps): RequiredComposerOptions {
  return {
    focusOnMount: false,
    isStopping: false,
    maxLength: 5_000,
    submitLabel: 'Submit message',
    variant: 'default',
    ...props
  };
}

function useChatComposer(options: RequiredComposerOptions) {
  const [uncontrolledMessage, setUncontrolledMessage] = useState('');
  const message = options.message ?? uncontrolledMessage;
  const setMessage = options.onMessageChange ?? setUncontrolledMessage;
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useComposerInputEffects(inputRef, message, options.disabled, options.focusOnMount);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const normalized = message.trim();
    if (!normalized || options.disabled) return;
    setMessage('');
    if (!(await options.onSubmit(normalized))) setMessage(normalized);
  };
  return { changeMessage: setMessage, inputRef, message, submit };
}

function useComposerInputEffects(
  inputRef: RefObject<HTMLTextAreaElement | null>,
  message: string,
  disabled: boolean,
  focusOnMount: boolean
) {
  useEffect(() => {
    if (focusOnMount && !disabled) inputRef.current?.focus();
  }, [disabled, focusOnMount, inputRef]);
  useEffect(() => {
    const input = inputRef.current;
    if (!input || input.value !== message) return;
    input.style.height = '0px';
    input.style.height = `${Math.min(input.scrollHeight, 144)}px`;
    input.style.overflowY = input.scrollHeight > 144 ? 'auto' : 'hidden';
  }, [inputRef, message]);
}

function ComposerToolbar({
  disabled,
  isResponding,
  isStopping,
  message,
  onStop,
  submitLabel,
  toolbarStart,
  variant
}: {
  disabled: boolean;
  isResponding: boolean;
  isStopping: boolean;
  message: string;
  onStop?: () => Promise<boolean>;
  submitLabel: string;
  toolbarStart?: ReactNode;
  variant: 'default' | 'sidechat';
}) {
  return (
    <div
      className={
        variant === 'sidechat'
          ? 'absolute right-1 bottom-1 left-1 flex items-center justify-between gap-2 sm:right-2 sm:bottom-2 sm:left-2'
          : 'absolute right-2 bottom-2 left-2 flex items-center justify-between gap-2'
      }
    >
      <div className="flex items-center gap-0.5">{toolbarStart}</div>
      {isResponding && onStop ? (
        <Button
          aria-label="Stop response"
          className={
            variant === 'sidechat'
              ? 'size-11 rounded-full shadow-none sm:size-7'
              : 'size-7 rounded-full shadow-none'
          }
          disabled={isStopping}
          onClick={() => void onStop()}
          size="icon-sm"
          title="Stop response"
          type="button"
        >
          <Square className={isStopping ? 'animate-pulse fill-current' : 'fill-current'} />
        </Button>
      ) : (
        <Button
          aria-label={submitLabel}
          className={
            variant === 'sidechat'
              ? 'size-11 rounded-full shadow-none sm:size-7'
              : 'size-7 rounded-full shadow-none'
          }
          disabled={disabled || message.trim().length === 0}
          size="icon-sm"
          type="submit"
        >
          <SendHorizontal className={isResponding ? 'animate-pulse' : undefined} />
        </Button>
      )}
    </div>
  );
}

function ComposerNotice({ notice, variant }: { notice: string; variant: 'default' | 'sidechat' }) {
  return (
    <p
      className={
        variant === 'sidechat'
          ? 'px-2 pb-0.5 text-[10px] text-muted-foreground'
          : 'pt-1 text-center text-[10px] text-muted-foreground'
      }
    >
      {notice}
    </p>
  );
}
