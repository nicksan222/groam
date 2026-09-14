import { ClipboardCheck } from 'lucide-react';

export function SubmittedFormResponse({ entries }: { entries: Array<[string, string]> }) {
  return (
    <span className="block min-w-0 text-left">
      <span className="flex items-center gap-2 border-b border-primary-foreground/15 pb-2 text-xs font-semibold">
        <ClipboardCheck className="size-3.5" />
        Your response
      </span>
      <span className="mt-2 grid gap-1.5">
        {entries.map(([label, value]) => (
          <span className="flex min-w-0 items-start justify-between gap-3 text-xs" key={label}>
            <span className="min-w-0 text-primary-foreground/70">{label}</span>
            <span className="max-w-[60%] text-right font-medium wrap-break-word">{value}</span>
          </span>
        ))}
      </span>
    </span>
  );
}
