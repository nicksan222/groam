import { CheckCircle2, Circle } from 'lucide-react';

export type CheckStateIconProps = {
  passed: boolean;
};

function CheckStateIcon({ passed }: CheckStateIconProps) {
  return passed ? (
    <CheckCircle2
      aria-hidden
      className="size-4 shrink-0 text-primary"
      data-slot="check-state-icon"
    />
  ) : (
    <Circle
      aria-hidden
      className="size-4 shrink-0 text-muted-foreground"
      data-slot="check-state-icon"
    />
  );
}

export { CheckStateIcon };
