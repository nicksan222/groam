import type { ReactNode } from 'react';

export type DetailSectionProps = {
  action?: ReactNode;
  children: ReactNode;
  title: string;
};

function DetailSection({ action, children, title }: DetailSectionProps) {
  return (
    <section
      className="border-t border-border/40 py-3 first:border-t-0 first:pt-0"
      data-slot="detail-section"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-medium text-muted-foreground">{title}</h2>
        {action}
      </div>
      <div className="mt-1.5">{children}</div>
    </section>
  );
}

export { DetailSection };
