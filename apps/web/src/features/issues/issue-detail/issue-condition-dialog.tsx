import { FormDialog } from '@groam/ui/components/form-dialog';
import { useGenerateRule } from '@/features/issues/hooks/use-generate-rule';
import { useRuleDraft } from '@/features/issues/hooks/use-rule-draft';
import { IssueRuleBuilder } from '@/features/issues/rule-builder/issue-rule-builder';
import { useAsyncPending } from '@/features/workspace/hooks/use-async-pending';
import { testIds } from '@/lib/test-ids';
import type { IssueCondition, IssueConditionInput } from '@/types/issues';

/** Builds or edits the rule that moves an issue to Done; removing every row clears it. */
export function IssueConditionDialog({
  condition,
  onClose,
  onSave,
  open
}: {
  condition: IssueCondition | null;
  onClose: () => void;
  onSave: (input: IssueConditionInput) => Promise<boolean>;
  open: boolean;
}) {
  const rule = useRuleDraft(condition, 'row');
  const pending = useAsyncPending();
  const generate = useGenerateRule();
  const hadCondition = condition !== null;

  const close = () => {
    if (pending.isPending) return;
    rule.reset();
    onClose();
  };

  return (
    <FormDialog
      size="tall"
      description="The system checks the shared trip every time it changes. While the rule holds, the issue sits in Done."
      isPending={pending.isPending}
      onClose={close}
      onSubmit={(event) => {
        event.preventDefault();
        void pending.run(async () => {
          if (await onSave(rule.input)) onClose();
        });
      }}
      open={open}
      submitDisabled={rule.isEmpty && !hadCondition}
      submitLabel={rule.isEmpty ? 'Remove rule' : 'Save rule'}
      testId={testIds.issueConditionDialog}
      title="Done when"
    >
      <IssueRuleBuilder
        disabled={pending.isPending}
        draft={rule.draft}
        generate={generate}
        onChange={rule.setDraft}
      />
    </FormDialog>
  );
}
