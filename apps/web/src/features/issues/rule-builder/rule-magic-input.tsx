import { MAX_RULE_PROMPT_LENGTH } from '@groam/backend/convex/modules/travel/issues/rules/index';
import { Sparkles } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { Input } from '@groam/ui/components/input';
import { Spinner } from '@groam/ui/components/spinner';
import { useState } from 'react';
import { testIds } from '@/lib/test-ids';
import type { IssueRule } from '@/types/issues';

/**
 * "Describe it" for a rule: a sentence goes to the AI, which answers with typed conditions that
 * replace the builder's rows for the person to review before saving.
 */
export function RuleMagicInput({
  disabled,
  generate,
  onRule
}: {
  disabled?: boolean;
  generate: (text: string) => Promise<IssueRule | null>;
  onRule: (rule: IssueRule) => void;
}) {
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  const busy = disabled || pending;

  const run = async () => {
    const request = text.trim();
    if (!request || busy) return;
    setPending(true);
    try {
      const rule = await generate(request);
      if (rule) {
        onRule(rule);
        setText('');
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-1.5 pl-3 focus-within:border-ring">
      <Sparkles aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <Input
        aria-label="Describe when this is done"
        className="h-8 min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
        data-testid={testIds.ruleMagicInput}
        disabled={busy}
        maxLength={MAX_RULE_PROMPT_LENGTH}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          // The builder sits inside a dialog form; Enter drafts instead of submitting it.
          if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
          event.preventDefault();
          void run();
        }}
        placeholder="Describe it: every day has a dinner and every night has a stay"
        value={text}
      />
      <Button
        data-testid={testIds.ruleMagicSubmit}
        disabled={busy || !text.trim()}
        onClick={() => void run()}
        className="shrink-0"
        size="sm"
        type="button"
      >
        {pending ? <Spinner /> : <Sparkles />}
        {/* The icon carries the button on phones; the label stays for screen readers. */}
        <span className="max-sm:sr-only">{pending ? 'Drafting…' : 'Draft rule'}</span>
      </Button>
    </div>
  );
}
