import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type InlineNoticeProps = {
  children: ReactNode;
  icon: LucideIcon;
  title: string;
};

function InlineNotice({ children, icon: Icon, title }: InlineNoticeProps) {
  return (
    <div
      className="dashboard-reveal flex items-start gap-3 rounded-xl border border-border p-4 text-sm sm:p-5"
      data-slot="inline-notice"
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}

export { InlineNotice };
