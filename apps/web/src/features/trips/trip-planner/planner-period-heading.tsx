import { Moon, Sun, Sunrise, Sunset } from '@groam/icons';
import { Separator } from '@groam/ui/components/separator';
import type { PlannerPeriod } from '@/types/trip-planner';

const periodIcons = { full_day: Moon, morning: Sunrise, afternoon: Sun, evening: Sunset };

/** The "Morning ———" rule that opens a part of the day, in the planner and in the editor. */
export function PlannerPeriodHeading({ label, period }: { label: string; period: PlannerPeriod }) {
  const Icon = periodIcons[period];
  return (
    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
      <h4 className="flex items-center gap-2">
        <Icon className="size-4" />
        {label}
      </h4>
      <Separator className="flex-1" />
    </div>
  );
}
