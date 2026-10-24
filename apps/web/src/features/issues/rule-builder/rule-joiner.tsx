import Shell from '@groam/ui/components/shell/client';

/** The lead word of a rule row: above the row on phones, a fixed column beside it from `sm`. */
export function RuleJoiner({ word }: { word: string }) {
  return (
    <Shell.Eyebrow
      as="span"
      aria-hidden
      className="shrink-0 px-1 sm:w-12 sm:px-0 sm:pt-2 sm:text-right"
      strong
    >
      {word}
    </Shell.Eyebrow>
  );
}
