import type { ReactNode } from 'react';

/** One event on the research history rail; the icon sits on the connecting line. */
export function ResearchTimelineItem({ children, icon }: { children: ReactNode; icon: ReactNode }) {
  return (
    <li className="relative pb-6 pl-8 last:pb-0">
      <span
        aria-hidden
        className="absolute top-0 left-0 grid size-6 place-items-center rounded-full border border-border bg-background text-muted-foreground [&_svg]:size-3.5"
      >
        {icon}
      </span>
      {children}
    </li>
  );
}
