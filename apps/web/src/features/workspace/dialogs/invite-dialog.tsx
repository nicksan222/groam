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
    groupName: activeOrganization.name,
    onClose,
    organizationId: activeOrganization.id
  });

  if (invite.inviteLink) {
    return (
      <InvitationCreatedDialog
        copied={invite.copied}
        email={invite.email}
        error={invite.request.error}
        inviteLink={invite.inviteLink}
        onClose={invite.close}
        onCopy={() => void invite.copyLink()}
        open={open}
      />
    );
  }

  return (
    <FormDialog
      description={`Invite a member to ${activeOrganization.name}. They join the group and share all of its trips.`}
      error={invite.request.error}
      isPending={invite.request.isPending}
      onClose={invite.close}
      onSubmit={(event) => void invite.submit(event)}
      open={open}
      submitLabel="Create invitation"
      testId={testIds.inviteDialog}
      title="Invite group member"
    >
      <FormField label="Email">
        <Input
          autoFocus
          data-testid={testIds.inviteEmail}
          disabled={invite.request.isPending}
          onChange={(event) => invite.setEmail(event.target.value)}
          placeholder="teammate@company.com"
          required
          type="email"
          value={invite.email}
        />
      </FormField>
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
  email,
  error,
  inviteLink,
  onClose,
  onCopy,
  open
}: {
  copied: boolean;
  email: string;
  error: string | null;
  inviteLink: string;
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
            Share this one-time link with {email}. They can sign in and join.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input
            aria-label="Invitation link"
            data-testid={testIds.invitationLink}
            readOnly
            value={inviteLink}
          />
          <Button onClick={onCopy} size="icon" variant="outline">
            {copied ? <Check /> : <Copy />}
            <span className="sr-only">Copy invitation link</span>
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
