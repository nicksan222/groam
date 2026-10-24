import { Flag } from '@groam/icons';

/** The mandatory flag, as a glyph that names itself. */
export function QueueMandatoryFlag({ className }: { className?: string }) {
  return (
    <span className={className} role="img" aria-label="Mandatory" title="Mandatory">
      <Flag aria-hidden className="size-3.5 text-warning" />
    </span>
  );
}
