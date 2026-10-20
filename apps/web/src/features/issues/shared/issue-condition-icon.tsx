import { CircleCheck, Flag, PenLine } from '@groam/icons';

/** The glyph for a condition's state: a check once met, a flag while pending, a pen when written by hand. */
export function IssueConditionIcon({
  className,
  manual = false,
  met
}: {
  className?: string;
  manual?: boolean;
  met: boolean | null;
}) {
  const Icon = manual ? PenLine : met ? CircleCheck : Flag;
  return <Icon aria-hidden className={className} />;
}
