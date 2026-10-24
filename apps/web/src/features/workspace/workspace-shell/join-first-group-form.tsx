import { Form } from '@groam/ui/components/form';
import { FormActions } from '@groam/ui/components/form-actions';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { useJoinGroup } from '@/features/workspace/hooks/use-join-group';
import { testIds } from '@/lib/test-ids';

export function JoinFirstGroupForm() {
  const join = useJoinGroup();

  return (
    <Form
      actions={
        <FormActions
          fullWidth
          isPending={join.isPending}
          submitDisabled={!join.hasPendingActivation && !join.code.trim()}
          submitLabel={join.hasPendingActivation ? 'Open group' : 'Join group'}
        />
      }
      error={join.error}
      isPending={join.isPending}
      onSubmit={join.submit}
    >
      <FormField label="Invitation code" required>
        <Input
          autoCapitalize="characters"
          autoComplete="off"
          data-testid={testIds.joinGroupCode}
          disabled={join.isPending || join.hasPendingActivation}
          onChange={(event) => join.setCode(event.target.value)}
          placeholder="e.g. ABCD-EFGH-JKLM"
          value={join.code}
        />
      </FormField>
    </Form>
  );
}
