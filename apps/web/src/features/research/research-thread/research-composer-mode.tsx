import { Button } from '@groam/ui/components/button';

const modes = [
  ['note', 'Add a note'],
  ['ask', 'Ask the researcher']
] as const;

/** Switches the composer between a group note and a follow-up for the researcher. */
export function ResearchComposerMode({
  mode,
  onChange
}: {
  mode: 'ask' | 'note';
  onChange: (mode: 'ask' | 'note') => void;
}) {
  return (
    <div
      aria-label="Contribution type"
      className="inline-flex rounded-md bg-muted p-1"
      role="group"
    >
      {modes.map(([value, label]) => (
        <Button
          aria-pressed={mode === value}
          className={
            mode === value
              ? 'bg-background text-foreground shadow-xs hover:bg-background'
              : 'text-muted-foreground hover:text-foreground'
          }
          key={value}
          onClick={() => onChange(value)}
          size="xs"
          type="button"
          variant="ghost"
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
