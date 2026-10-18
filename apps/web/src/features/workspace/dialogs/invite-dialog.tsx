import { Button } from '@groam/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@groam/ui/components/dialog';
import { FormDialog } from '@groam/ui/components/form-dialog';
import { FormFeedback } from '@groam/ui/components/form-feedback';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@groam/ui/components/select';
import { Check, Copy } from 'lucide-react';
import { useInviteDialog } from '@/features/workspace/hooks/use-invite-dialog';
import { useWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { testIds } from '@/lib/test-ids';
import type { WorkspaceDialogControlProps } from './types';

export function InviteDialog({ onClose, open }: WorkspaceDialogControlProps) {
  const { activeOrganization } = useWorkspace();
  const invite = useInviteDialog({
    onClose
  });

  if (invite.invitationCode) {
    return (
      <InvitationCreatedDialog
        copied={invite.copied}
        error={invite.request.error}
        invitationCode={invite.invitationCode}
        onClose={invite.close}
        onCopy={() => void invite.copyCode()}
        open={open}
      />
    );
  }

  return (
    <FormDialog
      description={`Create a one-time code for ${activeOrganization.name}. Share it directly with the person you want to invite.`}
      error={invite.request.error}
      isPending={invite.request.isPending}
      onClose={invite.close}
      onSubmit={(event) => void invite.submit(event)}
      open={open}
      submitLabel="Create code"
      testId={testIds.inviteDialog}
      title="Create invitation code"
    >
      <FormField label="Role">
        <Select
          disabled={invite.request.isPending}
          onValueChange={(value) => invite.setRole(value as 'admin' | 'member')}
          value={invite.role}
        >
          <SelectTrigger className="w-full" data-testid={testIds.inviteRole}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="member">Member</SelectItem>
            <SelectItem value="admin">Organizer</SelectItem>
          </SelectContent>
        </Select>
      </FormField>
    </FormDialog>
  );
}

function InvitationCreatedDialog({
  copied,
  error,
  invitationCode,
  onClose,
  onCopy,
  open
}: {
  copied: boolean;
  error: string | null;
  invitationCode: string;
  onClose: () => void;
  onCopy: () => void;
  open: boolean;
}) {
  return (
    <Dialog onOpenChange={(nextOpen) => !nextOpen && onClose()} open={open}>
      <DialogContent data-testid={testIds.inviteDialog}>
        <DialogHeader>
          <DialogTitle>Invitation created</DialogTitle>
          <DialogDescription>
            Share this code directly. It can be used once and expires in seven days.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input
            aria-label="Invitation code"
            data-testid={testIds.invitationCode}
            readOnly
            value={invitationCode}
          />
          <Button
            aria-label={copied ? 'Invitation code copied' : 'Copy invitation code'}
            onClick={onCopy}
            variant="outline"
          >
            {copied ? <Check /> : <Copy />}
            {copied ? 'Copied' : 'Copy code'}
          </Button>
        </div>
        <FormFeedback error={error} />
        <DialogFooter>
          <Button data-testid={testIds.invitationDone} onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
