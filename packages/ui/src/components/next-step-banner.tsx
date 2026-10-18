import { Button } from '@groam/ui/components/button';
import { SHELL_EYEBROW } from '@groam/ui/lib/shell-card';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

export type NextStepBannerProps = {
  action: ReactNode;
  eyebrow?: string;
  onAction: () => void;
  title: ReactNode;
};

function NextStepBanner({ action, eyebrow = 'Up next', onAction, title }: NextStepBannerProps) {
  return (
    <section
      className="dashboard-reveal rounded-xl border border-border px-4 py-3 sm:px-5"
      data-slot="next-step-banner"
    >
      <p className={SHELL_EYEBROW}>{eyebrow}</p>
      <div className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="min-w-0 text-sm font-semibold tracking-tight">{title}</h2>
        <Button
          className="h-auto min-h-0 gap-1 px-0 py-0 has-[>svg]:px-0"
          onClick={onAction}
          size="sm"
          variant="link"
        >
          {action}
          <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </section>
  );
}

export { NextStepBanner };
