/** The lead word of a rule row: above the row on phones, a fixed column beside it from `sm`. */
export function RuleJoiner({ word }: { word: string }) {
  return (
    <span
      aria-hidden
      className="shrink-0 px-0.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase sm:w-12 sm:px-0 sm:pt-2 sm:text-right"
    >
      {word}
    </span>
  );
}
