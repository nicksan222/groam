import { FormDialog } from '@groam/ui/components/form-dialog';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
import { useOpenSession } from '@groam/ui/hooks/use-open-session';
import { useGenerateRule } from '@/features/issues/hooks/use-generate-rule';
import { useRuleDraft } from '@/features/issues/hooks/use-rule-draft';
import { IssueRuleBuilder } from '@/features/issues/rule-builder/issue-rule-builder';
import { testIds } from '@/lib/test-ids';
import type { IssueCondition, IssueConditionInput } from '@/types/issues';

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type IssueConditionDialogProps = {
  condition: IssueCondition | null;
  onClose: () => void;
  onSave: (input: IssueConditionInput) => Promise<boolean>;
  open: boolean;
};

/** Builds or edits the rule that moves an issue to Done; removing every row clears it. */
export function IssueConditionDialog(props: IssueConditionDialogProps) {
  const session = useOpenSession(props.open);
  return <IssueConditionForm key={session} {...props} />;
}

function IssueConditionForm({ condition, onClose, onSave, open }: IssueConditionDialogProps) {
  const rule = useRuleDraft(condition, 'row');
  const form = useFormSubmit();
  const generate = useGenerateRule();
  const hadCondition = condition !== null;

  const close = () => {
    if (form.isPending) return;
    onClose();
  };

  return (
    <FormDialog
      size="tall"
      description="The system checks the shared trip every time it changes. While the rule holds, the issue sits in Done."
      error={form.error}
      isPending={form.isPending}
      onClose={close}
      onSubmit={form.handle(async () => {
        if (await onSave(rule.input)) onClose();
      })}
      open={open}
      submitDisabled={rule.isEmpty && !hadCondition}
      submitLabel={rule.isEmpty ? 'Remove rule' : 'Save rule'}
      testId={testIds.issueConditionDialog}
      title="Done when"
    >
      <IssueRuleBuilder
        disabled={form.isPending}
        draft={rule.draft}
        generate={generate}
        onChange={rule.setDraft}
      />
    </FormDialog>
  );
}
