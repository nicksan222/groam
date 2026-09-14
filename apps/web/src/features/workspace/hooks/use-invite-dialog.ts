import { authClient } from '@groam/auth/client';
import { env } from '@groam/env/web-client';
import type { FormEvent } from 'react';
import { errorMessage } from '@/lib/errors';
import { useInviteDialogStore } from '@/lib/stores/invite-dialog-store';

async function createInvitation({
  email,
  organizationId,
  role,
  tripName,
  groupName
}: {
  email: string;
  groupName?: string;
  organizationId: string;
  role: 'admin' | 'member';
  tripName?: string;
}) {
  const result = await authClient.organization.inviteMember({
    email,
    organizationId,
    role
  });
  if (result.error) throw new Error(result.error.message ?? 'Unable to invite teammate');
  const basePath = env.baseUrl.endsWith('/') ? env.baseUrl : `${env.baseUrl}/`;
  const url = new URL(`${basePath}invitation/${result.data.id}`, globalThis.location.origin);
  if (tripName) url.searchParams.set('trip', tripName);
  if (groupName) url.searchParams.set('group', groupName);
  return { invitationId: result.data.id, inviteLink: url.toString() };
}

export function useInviteDialog({
  groupName,
  onClose,
  onCreated,
  organizationId,
  tripName
}: {
  groupName?: string;
  onClose: () => void;
  onCreated?: (email: string, invitationId: string) => Promise<void> | void;
  organizationId: string;
  tripName?: string;
}) {
  const email = useInviteDialogStore((state) => state.email);
  const role = useInviteDialogStore((state) => state.role);
  const inviteLink = useInviteDialogStore((state) => state.inviteLink);
  const copied = useInviteDialogStore((state) => state.copied);
  const request = useInviteDialogStore((state) => state.request);
  const setEmail = useInviteDialogStore((state) => state.setEmail);
  const setRole = useInviteDialogStore((state) => state.setRole);
  const patchRequest = useInviteDialogStore((state) => state.patchRequest);
  const setInviteLink = useInviteDialogStore((state) => state.setInviteLink);
  const setCopied = useInviteDialogStore((state) => state.setCopied);
  const reset = useInviteDialogStore((state) => state.reset);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    patchRequest({ error: null, isPending: true });
    try {
      const created = await createInvitation({
        email: email.trim(),
        groupName,
        organizationId,
        role,
        tripName
      });
      await onCreated?.(email.trim(), created.invitationId);
      setInviteLink(created.inviteLink);
      patchRequest({ error: null, isPending: false });
    } catch (error: unknown) {
      patchRequest({ error: errorMessage(error, 'Unable to invite teammate'), isPending: false });
    }
  };

  const close = () => {
    reset();
    onClose();
  };

  const copyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
    } catch (error: unknown) {
      patchRequest({
        error: errorMessage(error, 'Unable to copy invitation link'),
        isPending: false
      });
    }
  };

  return {
    close,
    copied,
    copyLink,
    email,
    inviteLink,
    request,
    role,
    setEmail,
    setRole,
    submit
  };
}
