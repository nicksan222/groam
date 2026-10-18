import { useRisePulse } from './use-packing-motion';

/** A soft, brief wash behind a row whenever its claimed count goes up. Renders nothing at first. */
export function PackingRowFlash({ count }: { count: number }) {
  const pulse = useRisePulse(count);
  if (pulse === 0) return null;
  return (
    <span
      aria-hidden
      className="packing-row-flash pointer-events-none absolute inset-0 -z-10 rounded-lg bg-success/10"
      data-flash={pulse}
      key={pulse}
    />
  );
}
