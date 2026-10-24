import { Check, Send } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { Form } from '@groam/ui/components/form';
import { FormActions } from '@groam/ui/components/form-actions';
import { RichTextEditor } from '@groam/ui/components/rich-text-editor';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
import { useState } from 'react';

/**
 * Longest custom answer. The backend has no constant for it (a reply is checked against its
 * 5,000-character prompt limit), and @groam/ai cannot import the backend, so this stays local.
 */
const MAX_CUSTOM_ANSWER_LENGTH = 500;

export type AssistantChoice = {
  options: string[];
  question: string;
};

export function AssistantChoiceReceipt({
  choice,
  disabled,
  onChoose,
  selectedChoice
}: {
  choice: AssistantChoice;
  disabled: boolean;
  onChoose?: (choice: string) => Promise<boolean>;
  selectedChoice?: string;
}) {
  const [customAnswer, setCustomAnswer] = useState('');
  const [pendingChoice, setPendingChoice] = useState<string | null>(null);
  const selected = selectedChoice ?? pendingChoice;
  const customChoice = customAnswer.trim();
  const form = useFormSubmit();
  const choose = async (option: string) => {
    if (!onChoose || disabled || selected) return;
    // oxlint-disable-next-line groam/no-hand-rolled-pending -- the pending choice is shown as selected until the thread confirms it; it is not a busy flag
    setPendingChoice(option);
    if (!(await onChoose(option))) setPendingChoice(null);
  };

  const submitCustom = form.handle(async () => {
    if (customChoice) await choose(customChoice);
  });

  return (
    <section className="assistant-choice-card w-full min-w-0 max-w-full rounded-xl border border-border bg-background p-3">
      <p className="break-words text-sm leading-5 [overflow-wrap:anywhere]">{choice.question}</p>
      <div className="mt-3 grid min-w-0 gap-1">
        {choice.options.slice(0, 3).map((option) => {
          const isSelected = selected === option;
          return (
            <Button
              aria-label={option}
              aria-pressed={isSelected}
              className={`h-auto min-h-9 w-full min-w-0 max-w-full justify-start rounded-lg border px-3 py-2 text-left text-xs font-normal whitespace-normal shadow-none ${
                isSelected
                  ? 'border-border bg-secondary text-foreground'
                  : 'border-transparent bg-muted/50 hover:bg-muted'
              }`}
              disabled={disabled || selected !== null || !onChoose}
              key={option}
              onClick={() => void choose(option)}
              size="sm"
              variant="ghost"
            >
              <span
                className={`grid size-4 shrink-0 place-items-center rounded-full border ${
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted-foreground/40'
                }`}
              >
                {isSelected && <Check className="size-2.5" />}
              </span>
              <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{option}</span>
            </Button>
          );
        })}
        <Form
          className="mt-1 gap-2 border-t border-border pt-2"
          actions={
            <FormActions
              isPending={form.isPending}
              size="xs"
              submitDisabled={disabled || selected !== null || !customChoice || !onChoose}
              submitIcon={<Send aria-hidden />}
              submitLabel="Send answer"
            />
          }
          error={form.error}
          isPending={form.isPending}
          onSubmit={submitCustom}
        >
          <RichTextEditor
            maxLength={MAX_CUSTOM_ANSWER_LENGTH}
            aria-label="Custom answer"
            className="min-w-0 flex-1 rounded-lg border border-border bg-background focus-within:border-muted-foreground/60"
            contentClassName="max-h-32 min-h-10 overflow-y-auto px-3 py-2 text-xs leading-5"
            disabled={disabled || selected !== null || !onChoose}
            onChange={setCustomAnswer}
            onSubmit={submitCustom}
            placeholder="Or write your own answer…"
            submitShortcut="enter"
            value={customAnswer}
            variant="bare"
          />
        </Form>
      </div>
    </section>
  );
}
