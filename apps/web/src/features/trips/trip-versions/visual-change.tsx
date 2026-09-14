import { Button } from '@groam/ui/components/button';
import Shell from '@groam/ui/components/shell/client';
import { ChevronDown, MessageSquare, Minus, Pencil, Plus } from 'lucide-react';
import { useId } from 'react';
import type { useTripVersion } from '@/features/trips/hooks/use-trip-versions';
import { isEmptyDiffField } from '@/features/trips/hooks/version-format';
import { useOpenState } from '@/features/workspace/hooks/use-open-state';
import { ChangeCommentComposer } from './change-comment-composer';
import { DiffFieldValue } from './diff-field-value';
import type { ProposalFeedbackItem } from './proposal-types';

// biome-ignore lint/plugin/no-local-type-definitions: local presentation shape
export type VersionChange = NonNullable<
  ReturnType<typeof useTripVersion>['proposal']
>['changes'][number];

function ChangeFields({
  change,
  expanded,
  id
}: {
  change: VersionChange;
  expanded: boolean;
  id: string;
}) {
  const fields = change.fields.filter(
    (field) => !isEmptyDiffField(field, 'before') || !isEmptyDiffField(field, 'after')
  );
  return (
    <div className="border-t border-border" hidden={!expanded} id={id}>
      {fields.length === 0 ? (
        <p className="px-4 py-5 text-sm text-muted-foreground">
          This {change.entity} was {change.change}.
        </p>
      ) : (
        <>
          <div className="hidden grid-cols-[minmax(6rem,0.6fr)_minmax(0,1fr)_minmax(0,1fr)] border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:grid">
            <span className="px-4 py-3">Detail</span>
            <span className="border-l border-border px-4 py-3">Shared plan</span>
            <span className="border-l border-border px-4 py-3 text-primary">Your idea</span>
          </div>
          <div className="divide-y divide-border">
            {fields.map((field) => (
              <div
                className="grid gap-3 p-4 sm:grid-cols-[minmax(6rem,0.6fr)_minmax(0,1fr)_minmax(0,1fr)] sm:gap-0 sm:p-0"
                key={field.key}
              >
                <span className="min-w-0 break-words text-xs font-medium leading-5 text-muted-foreground sm:px-4 sm:py-4">
                  {field.label}
                </span>
                {(['before', 'after'] as const).map((side) => (
                  <div
                    className="min-w-0 break-words text-sm sm:border-l sm:border-border sm:px-4 sm:py-4"
                    key={side}
                  >
                    <span
                      className={`mb-1 block text-[10px] font-medium uppercase tracking-wide sm:hidden ${side === 'after' ? 'text-primary' : 'text-muted-foreground'}`}
                    >
                      {side === 'after' ? 'Your idea' : 'Shared plan'}
                    </span>
                    <DiffFieldValue field={field} side={side} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ChangeComments({
  comments,
  label,
  onCancel,
  onComment,
  open
}: {
  comments?: ProposalFeedbackItem[];
  label: string;
  onCancel: () => void;
  onComment?: (content: string) => Promise<boolean>;
  open: boolean;
}) {
  if ((comments?.length ?? 0) === 0 && !open) return null;
  return (
    <div className="space-y-3 border-t border-border p-4">
      {comments?.map((comment) => (
        <p className="text-xs leading-5 text-muted-foreground" key={comment.id}>
          <span className="font-medium text-foreground">{comment.author.name}: </span>
          {comment.content}
        </p>
      ))}
      {open && onComment ? (
        <ChangeCommentComposer label={label} onCancel={onCancel} onComment={onComment} />
      ) : null}
    </div>
  );
}

export function VisualChange({
  change,
  comments,
  onComment,
  expanded = true,
  onToggle
}: {
  change: VersionChange;
  comments?: ProposalFeedbackItem[];
  onComment?: (content: string) => Promise<boolean>;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const visibleFieldCount = change.fields.filter(
    (field) => !isEmptyDiffField(field, 'before') || !isEmptyDiffField(field, 'after')
  ).length;
  const commenting = useOpenState(false);
  const detailId = useId();
  const Icon = change.change === 'added' ? Plus : change.change === 'removed' ? Minus : Pencil;
  const tone =
    change.change === 'added'
      ? 'text-primary border-primary/25'
      : change.change === 'removed'
        ? 'text-destructive border-destructive/25'
        : 'text-foreground border-border';
  const verb =
    change.change === 'added' ? 'Added' : change.change === 'removed' ? 'Removed' : 'Updated';
  return (
    <Shell.Card as="article" className="overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          aria-controls={detailId}
          aria-expanded={expanded}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${change.label}`}
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-md py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onToggle}
          type="button"
        >
          <span className={`grid size-9 shrink-0 place-items-center rounded-lg border ${tone}`}>
            <Icon className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <h4 className="break-words text-sm font-semibold leading-5">{change.label}</h4>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {verb} {change.entity} · {visibleFieldCount}{' '}
              {visibleFieldCount === 1 ? 'detail' : 'details'}
            </span>
          </span>
          <ChevronDown
            aria-hidden
            className={`size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none ${expanded ? '' : '-rotate-90'}`}
          />
        </button>
        {onComment && (
          <Button
            aria-label={`Comment on ${change.label}`}
            onClick={commenting.openPanel}
            size="sm"
            variant="outline"
          >
            <MessageSquare className="size-3.5" />
            <span className="hidden sm:inline">Comment</span>
            {(comments?.length ?? 0) > 0 && <span>{comments?.length}</span>}
          </Button>
        )}
      </div>
      <ChangeFields change={change} expanded={expanded} id={detailId} />
      <ChangeComments
        comments={comments}
        label={change.label}
        onCancel={commenting.closePanel}
        onComment={onComment}
        open={commenting.open}
      />
    </Shell.Card>
  );
}
