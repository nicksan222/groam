import { CalendarClock, ChevronDown, CircleDot, UserRound, X } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { DatePicker } from '@groam/ui/components/date-picker';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@groam/ui/components/dropdown-menu';
import { Separator } from '@groam/ui/components/separator';
import { dateFromString } from '@groam/ui/lib/calendar-date';
import { statusChangeRefusal } from '@/features/issues/issue-condition-rules';
import { ISSUE_STATUSES, issueStatusMeta } from '@/features/issues/issue-status';
import { IssueAssigneePicker } from '@/features/issues/shared/issue-assignee-picker';
import type { QueueItem } from '@/types/queue';
import { useQueueBatch } from './hooks/use-queue-batch';

/** Why a status cannot be applied to the whole selection, if an issue's rule refuses it. */
function batchRefusal(selected: readonly QueueItem[], status: (typeof ISSUE_STATUSES)[number]) {
  for (const item of selected) {
    if (!item.issueStatus) continue;
    const refusal = statusChangeRefusal(item.condition ?? null, item.issueStatus, status);
    if (refusal) return refusal;
  }
  return null;
}

/**
 * The floating bar over the selected issues: Status, Assign, and Decide by each apply to all of
 * them, then the selection that took the change is dropped. `canAssign` mirrors the issue page,
 * where only organizers assign.
 */
export function QueueBatchBar({
  onClear,
  onDone,
  selected
}: {
  onClear: () => void;
  /** Called with the ids a change reached, so they leave the selection. */
  onDone: (ids: readonly string[]) => void;
  selected: readonly QueueItem[];
}) {
  const batch = useQueueBatch(selected);
  const canAssign = selected.every((item) => item.canAssign);
  const finish = async (work: Promise<readonly string[]>) => onDone(await work);
  return (
    <div className="sticky bottom-14 z-20 flex h-0 justify-center max-md:hidden">
      <div
        aria-label="Selected issues"
        className="absolute bottom-0 flex w-fit max-w-full flex-wrap items-center gap-1 rounded-xl border border-input bg-popover p-2 pl-4 text-sm text-popover-foreground shadow-lg"
        data-slot="queue-batch-bar"
        role="toolbar"
      >
        <b className="mr-2 font-semibold text-foreground">{selected.length} selected</b>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost">
              <CircleDot aria-hidden />
              Status
              <ChevronDown aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" side="top">
            {ISSUE_STATUSES.map((status) => {
              const Glyph = issueStatusMeta[status].icon;
              const refusal = batchRefusal(selected, status);
              return (
                <DropdownMenuItem
                  disabled={refusal !== null}
                  key={status}
                  onSelect={() => void finish(batch.setStatus(status))}
                  title={refusal ?? undefined}
                >
                  <Glyph aria-hidden className="size-4" />
                  {issueStatusMeta[status].label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        <IssueAssigneePicker
          align="center"
          assignee={null}
          disabled={!canAssign}
          onAssign={(next) => {
            if (next) void finish(batch.assign(next));
          }}
        >
          <Button size="sm" variant="ghost">
            <UserRound aria-hidden />
            Assign
            <ChevronDown aria-hidden />
          </Button>
        </IssueAssigneePicker>
        <span className="flex items-center gap-1">
          <CalendarClock aria-hidden className="ml-1 size-4 text-muted-foreground" />
          <DatePicker
            className="w-36"
            clearable={false}
            label="Decide by"
            onChange={(value) => {
              const date = value ? dateFromString(value) : undefined;
              if (date) void finish(batch.setDue(date.setHours(12)));
            }}
            placeholder="Decide by"
          />
        </span>
        <Separator className="mx-1 data-[orientation=vertical]:h-[18px]" orientation="vertical" />
        <Button aria-label="Clear selection" onClick={onClear} size="icon-sm" variant="ghost">
          <X aria-hidden />
        </Button>
      </div>
    </div>
  );
}
