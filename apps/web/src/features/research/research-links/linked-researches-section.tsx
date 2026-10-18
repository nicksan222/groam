import { Button } from '@groam/ui/components/button';
import { Popover, PopoverContent, PopoverTrigger } from '@groam/ui/components/popover';
import { Link2, Plus } from 'lucide-react';
import { useState } from 'react';
import { testIds } from '@/lib/test-ids';
import type { ResearchSummary } from '@/types/research';

export function LinkedResearchesSection({
  linked,
  onLink,
  onNew,
  onOpen,
  available
}: {
  /** Researches in the trip that are not yet linked; offered by "Link research". */
  available: ResearchSummary[];
  linked: ResearchSummary[];
  onLink: (research: ResearchSummary) => void;
  onNew: () => void;
  onOpen: (research: ResearchSummary) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="grid gap-2" data-testid={testIds.linkedResearchesSection}>
      <h3 className="text-sm font-medium">Research</h3>
      {linked.length === 0 ? (
        <p className="text-sm text-muted-foreground">No research linked yet.</p>
      ) : (
        <ul className="grid gap-1">
          {linked.map((research) => (
            <li key={research.id}>
              <Button
                variant="ghost"
                className="block h-auto w-full justify-start truncate rounded-md px-2 py-1 text-left text-sm font-normal hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onOpen(research)}
                type="button"
              >
                {research.title}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <Popover onOpenChange={setOpen} open={open}>
          <PopoverTrigger asChild>
            <Button size="sm" type="button" variant="outline">
              <Link2 aria-hidden /> Link research
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-1">
            {available.length === 0 ? (
              <p className="px-2 py-3 text-sm text-muted-foreground">No other research to link</p>
            ) : (
              available.map((research) => (
                <Button
                  variant="ghost"
                  className="block h-auto w-full justify-start truncate rounded-md px-2 py-1.5 text-left text-sm font-normal hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                  data-testid={testIds.linkResearchPick}
                  key={research.id}
                  onClick={() => {
                    onLink(research);
                    setOpen(false);
                  }}
                  type="button"
                >
                  {research.title}
                </Button>
              ))
            )}
          </PopoverContent>
        </Popover>
        <Button
          data-testid={testIds.linkResearchNew}
          onClick={onNew}
          size="sm"
          type="button"
          variant="outline"
        >
          <Plus aria-hidden /> New research
        </Button>
      </div>
    </section>
  );
}
