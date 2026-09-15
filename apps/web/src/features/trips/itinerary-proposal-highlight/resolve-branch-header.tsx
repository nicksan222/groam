import { ArrowRight } from 'lucide-react';

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
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Shared trip
        </span>
        <p className="truncate text-sm font-medium">{sharedBranchName}</p>
      </div>
      <ArrowRight className="hidden size-4 text-muted-foreground sm:block" />
      <div className="min-w-0 sm:text-right">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">
          This idea
        </span>
        <p className="truncate text-sm font-medium">{ideaBranchName}</p>
      </div>
    </section>
  );
}
