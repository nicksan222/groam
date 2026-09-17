import { api } from '@groam/backend/api';
import { useMutation } from 'convex/react';
import type { FormEvent } from 'react';
import { errorMessage } from '@/lib/errors';
import { useInviteDialogStore } from '@/lib/stores/invite-dialog-store';

export function useInviteDialog({ onClose }: { onClose: () => void }) {
  const createInvitation = useMutation(api.routes.organizations.invitations.create.run);
  const role = useInviteDialogStore((state) => state.role);
  const invitationCode = useInviteDialogStore((state) => state.invitationCode);
  const copied = useInviteDialogStore((state) => state.copied);
  const request = useInviteDialogStore((state) => state.request);
  const setRole = useInviteDialogStore((state) => state.setRole);
  const patchRequest = useInviteDialogStore((state) => state.patchRequest);
  const setInvitationCode = useInviteDialogStore((state) => state.setInvitationCode);
  const setCopied = useInviteDialogStore((state) => state.setCopied);
  const reset = useInviteDialogStore((state) => state.reset);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    patchRequest({ error: null, isPending: true });
    try {
      const created = await createInvitation({ role });
      setInvitationCode(created.code);
      patchRequest({ error: null, isPending: false });
    } catch (error: unknown) {
      patchRequest({
        error: errorMessage(error, 'Unable to create invitation code'),
        isPending: false
      });
    }
  };

  const close = () => {
    reset();
    onClose();
  };

  const copyCode = async () => {
    if (!invitationCode) return;
    try {
      await navigator.clipboard.writeText(invitationCode);
      setCopied(true);
    } catch (error: unknown) {
      patchRequest({
        error: errorMessage(error, 'Unable to copy invitation code'),
        isPending: false
      });
    }
  };

  return {
    close,
    copied,
    copyCode,
    invitationCode,
    request,
    role,
    setRole,
    submit
  };
}
