import { Ban } from '@groam/icons';

/**
 * Why the lane under the lifted card refuses it, laid over that lane. It is not announced here; the
 * drag announcements already say it.
 */
export function KanbanDropHint({ reason, testId }: { reason: string; testId?: string }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-destructive/40 bg-background/85 p-6 text-center backdrop-blur-[1px]"
      data-testid={testId}
    >
      <Ban aria-hidden className="size-5 text-destructive" />
      <p className="text-sm font-medium">Can’t drop here</p>
      <p className="text-xs leading-relaxed text-muted-foreground">{reason}</p>
    </div>
  );
}
