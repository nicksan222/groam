import { Link } from '@/features/workspace/navigation/router';
import type { DashboardSeeAllTarget as SeeAllTarget } from '@/types/dashboard';

export function DashboardSectionHeading({
  description,
  id,
  seeAll,
  title
}: {
  description: string;
  id: string;
  seeAll?: SeeAllTarget;
  title: string;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-foreground" id={id}>
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {seeAll ? (
        <Link
          className="shrink-0 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          to={seeAll.to}
        >
          {seeAll.label}
        </Link>
      ) : null}
    </div>
  );
}
