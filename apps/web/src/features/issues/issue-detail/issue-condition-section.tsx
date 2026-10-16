import { DetailSection } from '@groam/ui/components/detail-section';
import { cn } from '@groam/ui/lib/utils';
import { CircleCheck, Flag, PenLine } from 'lucide-react';
import { testIds } from '@/lib/test-ids';
import type { IssueCondition } from '@/types/issues';

/**
 * The "Done when" panel. A manual condition shows its text; an auto condition shows whether the
 * shared trip meets it yet. Starting an idea lives in the Idea section, so there is one place.
 */
export function IssueConditionSection({ condition }: { condition: IssueCondition | null }) {
  if (!condition) return null;
  const auto = condition.kind === 'auto';
  const Icon = auto ? (condition.met ? CircleCheck : Flag) : PenLine;
  return (
    <DetailSection title="Done when">
      <div
        className="space-y-2"
        data-met={condition.met ?? undefined}
        data-testid={testIds.issueConditionPanel}
      >
        <p className="flex items-start gap-2 text-sm font-medium">
          <Icon
            aria-hidden
            className={cn(
              'mt-0.5 size-4 shrink-0',
              condition.met ? 'text-success-foreground' : 'text-muted-foreground'
            )}
          />
          <span className="min-w-0">{condition.label}</span>
        </p>
        {auto ? (
          <p className="text-xs text-muted-foreground">
            {condition.met
              ? 'Met. It stays Done until the shared trip changes.'
              : 'Not met yet. Closes automatically when the trip changes; start an idea to get there.'}
          </p>
        ) : null}
      </div>
    </DetailSection>
  );
}
