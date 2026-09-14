import type { LucideIcon } from 'lucide-react';

export type CountHeadingProps = {
  count: number | string;
  icon: LucideIcon;
  title: string;
};

function CountHeading({ count, icon: Icon, title }: CountHeadingProps) {
  return (
    <div className="flex items-center gap-2.5" data-slot="count-heading">
      <Icon className="size-3.5 text-muted-foreground" />
      <h2 className="text-sm font-medium">{title}</h2>
      <span className="rounded-md border border-border px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
        {count}
      </span>
    </div>
  );
}

export { CountHeading };
