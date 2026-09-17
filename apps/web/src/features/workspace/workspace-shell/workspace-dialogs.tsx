import { CreateOrganizationDialog } from '@/features/workspace/dialogs/create-organization-dialog';
import { InviteDialog } from '@/features/workspace/dialogs/invite-dialog';
import { JoinGroupDialog } from '@/features/workspace/dialogs/join-group-dialog';
import { useWorkspaceDialogs } from './workspace-dialog-state';

export function WorkspaceDialogs() {
  const { closeDialog, dialog } = useWorkspaceDialogs();
  return (
    <>
      <CreateOrganizationDialog onClose={closeDialog} open={dialog === 'create-organization'} />
      <InviteDialog onClose={closeDialog} open={dialog === 'invite'} />
      <JoinGroupDialog onClose={closeDialog} open={dialog === 'join'} />
    </>
  );
}
