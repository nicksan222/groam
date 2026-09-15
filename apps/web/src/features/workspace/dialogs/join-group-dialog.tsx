import { FormDialog } from '@groam/ui/components/form-dialog';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { useJoinGroup } from '@/features/workspace/hooks/use-join-group';
import { testIds } from '@/lib/test-ids';
import type { WorkspaceDialogControlProps } from './types';

export function JoinGroupDialog({ onClose, open }: WorkspaceDialogControlProps) {
  const join = useJoinGroup({ onJoined: onClose });

  return (
    <FormDialog
      description="Enter the one-time code shared by a group organizer."
      error={join.error}
      isPending={join.isPending}
      onClose={onClose}
      onSubmit={(event) => void join.submit(event)}
      open={open}
      submitDisabled={!join.hasJoined && !join.code.trim()}
      submitLabel={join.hasJoined ? 'Open joined group' : 'Join group'}
      testId={testIds.joinGroupDialog}
      title="Join with invitation code"
    >
      <FormField label="Invitation code">
        <Input
          autoCapitalize="characters"
          autoComplete="off"
          autoFocus
          data-testid={testIds.joinGroupCode}
          disabled={join.isPending || join.hasJoined}
          onChange={(event) => join.setCode(event.target.value)}
          placeholder="ABCD-EFGH-JKLM"
          required
          value={join.code}
        />
      </FormField>
    </FormDialog>
  );
}
