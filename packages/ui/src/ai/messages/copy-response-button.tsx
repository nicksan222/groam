import { Button } from '@groam/ui/components/button';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

export function CopyResponseButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      aria-label={copied ? 'AI response copied' : 'Copy AI response'}
      className="mt-1 h-7 rounded-lg px-2 text-[10px] text-muted-foreground"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        } catch {
          setCopied(false);
        }
      }}
      size="xs"
      type="button"
      variant="ghost"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? 'Copied' : 'Copy'}
    </Button>
  );
}
