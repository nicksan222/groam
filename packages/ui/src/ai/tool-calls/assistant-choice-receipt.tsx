import { Button } from '@groam/ui/components/button';
import { Textarea } from '@groam/ui/components/textarea';
import { Check, Send } from 'lucide-react';
import { useState } from 'react';

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
  const choose = async (option: string) => {
    if (!onChoose || disabled || selected) return;
    setPendingChoice(option);
    if (!(await onChoose(option))) setPendingChoice(null);
  };

  return (
    <section className="assistant-choice-card w-full min-w-0 max-w-full rounded-xl border border-border bg-background p-3">
      <p className="break-words text-sm leading-5 [overflow-wrap:anywhere]">{choice.question}</p>
      <div className="mt-2.5 grid min-w-0 gap-1">
        {choice.options.slice(0, 3).map((option) => {
          const isSelected = selected === option;
          return (
            <Button
              aria-label={option}
              aria-pressed={isSelected}
              className={`h-auto min-h-9 w-full min-w-0 max-w-full justify-start rounded-lg border px-2.5 py-2 text-left text-xs font-normal whitespace-normal shadow-none ${
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
        <form
          className="mt-1 flex min-w-0 items-start gap-1.5 border-t border-border pt-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (customChoice) void choose(customChoice);
          }}
        >
          <Textarea
            aria-label="Custom answer"
            className="max-h-32 min-h-10 flex-1 resize-none rounded-lg border-border bg-background px-2.5 py-2 text-xs leading-5 shadow-none focus-visible:border-muted-foreground/60 focus-visible:ring-0"
            disabled={disabled || selected !== null || !onChoose}
            maxLength={500}
            onChange={(event) => setCustomAnswer(event.target.value)}
            onInput={(event) => {
              event.currentTarget.style.height = 'auto';
              event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
            }}
            placeholder="Or write your own answer…"
            rows={2}
            value={customAnswer}
          />
          <Button
            aria-label="Send custom answer"
            className="mt-0.5 size-8 rounded-lg"
            disabled={disabled || selected !== null || !customChoice || !onChoose}
            size="icon-sm"
            type="submit"
            variant="ghost"
          >
            <Send className="size-3.5" />
          </Button>
        </form>
      </div>
    </section>
  );
}
