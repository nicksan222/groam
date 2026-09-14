import { CalendarDays, Moon, Sun, Sunrise } from 'lucide-react';

export function EditorEmptyDay() {
  return (
    <div className="border-t border-border">
      <div className="flex gap-3 px-4 py-5">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground">
          <CalendarDays aria-hidden="true" className="size-4" />
        </span>
        <div>
          <h4 className="text-sm font-semibold">A day of possibilities</h4>
          <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">
            Add your first plan above. Give it a time or keep it flexible.
          </p>
        </div>
      </div>
      <div className="divide-y divide-border border-t border-border">
        {[
          { label: 'Morning', icon: Sunrise },
          { label: 'Afternoon', icon: Sun },
          { label: 'Evening', icon: Moon }
        ].map(({ label, icon: Icon }) => (
          <div key={label} className="flex items-center gap-2 px-4 py-3 text-xs">
            <Icon aria-hidden="true" className="size-3.5 text-muted-foreground" />
            <span className="font-medium">{label}</span>
            <span className="ml-auto text-muted-foreground">Open to explore</span>
          </div>
        ))}
      </div>
    </div>
  );
}
