import { Settings2 } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { DetailSection } from '@groam/ui/components/detail-section';
import { useState } from 'react';
import { testIds } from '@/lib/test-ids';
import type { IssueCondition, IssueConditionInput } from '@/types/issues';
import { IssueConditionDialog } from './issue-condition-dialog';
import { IssueConditionSummary } from './issue-condition-summary';

/**
 * The "Done when" panel. A manual condition shows its text; a rule, starter or composed, shows
 * whether the shared trip meets it yet, clause by clause. Starting an idea lives in
 * the Idea section, so there is one place. People who manage the issue can edit any condition with
 * the same builder as creation; editing a starter makes it their own rule.
 */
export function IssueConditionSection({
  canEdit = false,
  condition,
  onSave
}: {
  canEdit?: boolean;
  condition: IssueCondition | null;
  onSave?: (input: IssueConditionInput) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const save = canEdit ? onSave : undefined;
  if (!condition && !save) return null;
  const actionLabel = condition?.kind === 'rule' ? 'Edit rule' : 'Build rule';
  const action = save ? (
    <Button
      aria-label={actionLabel}
      className="-mr-1.5 text-muted-foreground hover:text-foreground"
      data-testid={testIds.issueEditCondition}
      onClick={() => setEditing(true)}
      size="icon-xs"
      title={actionLabel}
      type="button"
      variant="ghost"
    >
      <Settings2 />
    </Button>
  ) : null;
  return (
    <DetailSection action={action} title="Done when">
      {condition ? (
        <IssueConditionSummary condition={condition} />
      ) : (
        <p className="text-xs text-muted-foreground">
          No rule yet. Build one to move this to Done by itself.
        </p>
      )}
      {save && editing ? (
        <IssueConditionDialog
          condition={condition}
          onClose={() => setEditing(false)}
          onSave={save}
          open
        />
      ) : null}
    </DetailSection>
  );
}
