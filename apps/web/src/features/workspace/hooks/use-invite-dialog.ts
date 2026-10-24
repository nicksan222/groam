import { api } from '@groam/backend/api';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
import { useMutation } from 'convex/react';
import { useState } from 'react';
import { errorMessage } from '@/lib/errors';

/** Draft state for one opening of the invite dialog; remount it (key) for a fresh draft. */
export function useInviteDialog({ onClose }: { onClose: () => void }) {
  const createInvitation = useMutation(api.routes.organizations.invitations.create.run);
  const form = useFormSubmit({ fallbackError: 'Unable to create invitation code' });
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [invitationCode, setInvitationCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const submit = form.handle(async () => {
    const created = await createInvitation({ role });
    setInvitationCode(created.code);
  });

  const copyCode = async () => {
    if (!invitationCode) return;
    try {
      await navigator.clipboard.writeText(invitationCode);
      setCopied(true);
      setCopyError(null);
    } catch (error: unknown) {
      setCopyError(errorMessage(error, 'Unable to copy invitation code'));
    }
  };

  return {
    close: onClose,
    copied,
    copyCode,
    invitationCode,
    request: { error: copyError ?? form.error, isPending: form.isPending },
    role,
    setRole,
    submit
  };
}
