import { Link2, Plus } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { DetailSection } from '@groam/ui/components/detail-section';
import { List } from '@groam/ui/components/list';
import { MutedCopy } from '@groam/ui/components/muted-copy';
import { Popover, PopoverContent, PopoverTrigger } from '@groam/ui/components/popover';
import { useState } from 'react';
import { testIds } from '@/lib/test-ids';
import type { ResearchSummary } from '@/types/research';
import { LinkedResearchItem } from './linked-research-item';

export function LinkedResearchesSection({
  linked,
  onLink,
  onNew,
  tripId,
  available
}: {
  /** Researches in the trip that are not yet linked; offered by "Link research". */
  available: ResearchSummary[];
  linked: ResearchSummary[];
  onLink: (research: ResearchSummary) => void;
  onNew: () => void;
  tripId: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div data-testid={testIds.linkedResearchesSection}>
      <DetailSection
        title="Research"
        action={
          <div className="-mr-1 flex items-center gap-1">
            <Popover onOpenChange={setOpen} open={open}>
              <PopoverTrigger asChild>
                <Button
                  aria-label="Link research"
                  title="Link existing research"
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Link2 aria-hidden />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 p-1">
                {available.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-muted-foreground">
                    No other research to link
                  </p>
                ) : (
                  available.map((research) => (
                    <Button
                      variant="ghost"
                      className="block h-auto w-full justify-start truncate rounded-md px-2 py-2 text-left text-sm font-normal hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
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
              aria-label="New research"
              title="New research"
              size="icon-sm"
              type="button"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
            >
              <Plus aria-hidden />
            </Button>
          </div>
        }
      >
        {linked.length === 0 ? (
          <MutedCopy size="xs">No research linked yet.</MutedCopy>
        ) : (
          <List bleed={false}>
            <List.Body>
              <List.Group aria-label="Linked research">
                {linked.map((research) => (
                  <LinkedResearchItem key={research.id} research={research} tripId={tripId} />
                ))}
              </List.Group>
            </List.Body>
          </List>
        )}
      </DetailSection>
    </div>
  );
}
