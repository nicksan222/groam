import { ArrowRight } from '@groam/icons';
import Shell from '@groam/ui/components/shell/client';

export function ResolveBranchHeader({
  ideaBranchName,
  sharedBranchName
}: {
  ideaBranchName: string;
  sharedBranchName: string;
}) {
  return (
    <section
      aria-label="Compared sides"
      className="mt-2 grid items-center gap-2 border-t border-border pt-3 text-left sm:grid-cols-[1fr_auto_1fr]"
    >
      <div className="min-w-0">
        <Shell.Eyebrow as="span" size="dense" strong>
          Shared trip
        </Shell.Eyebrow>
        <p className="truncate text-sm font-medium">{sharedBranchName}</p>
      </div>
      <ArrowRight className="hidden size-4 text-muted-foreground sm:block" />
      <div className="min-w-0 sm:text-right">
        <Shell.Eyebrow as="span" size="dense" strong tone="primary">
          This idea
        </Shell.Eyebrow>
        <p className="truncate text-sm font-medium">{ideaBranchName}</p>
      </div>
    </section>
  );
}
