import { authClient } from '@groam/auth/client';
import { MAX_ORGANIZATION_NAME_LENGTH } from '@groam/backend/convex/modules/organizations/lengths';
import { FormDialog } from '@groam/ui/components/form-dialog';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
import { useOpenSession } from '@groam/ui/hooks/use-open-session';
import { useState } from 'react';
import { activateOrganization } from '@/features/workspace/hooks/use-organization-activation';
import { createSlug } from '@/features/workspace/workspace-shell/workspace-state';
import { testIds } from '@/lib/test-ids';
import type { WorkspaceDialogControlProps } from './types';

export function CreateOrganizationDialog({ onClose, open }: WorkspaceDialogControlProps) {
  const session = useOpenSession(open);
  return <CreateOrganizationForm key={session} onClose={onClose} open={open} />;
}

function CreateOrganizationForm({ onClose, open }: WorkspaceDialogControlProps) {
  const [name, setName] = useState('');
  const form = useFormSubmit({ fallbackError: 'Unable to create group' });

  const submit = form.handle(async () => {
    const normalizedName = name.trim();
    if (!normalizedName) return;
    const result = await authClient.organization.create({
      keepCurrentActiveOrganization: true,
      name: normalizedName,
      slug: createSlug(normalizedName)
    });
    if (result.error) throw new Error(result.error.message ?? 'Unable to create group');
    // Switch through the same boundary as the group picker, after queries pause.
    await activateOrganization(result.data.id);
    onClose();
  });

  return (
    <FormDialog
      description="Create an isolated group with its own members and trips."
      error={form.error}
      isPending={form.isPending}
      onClose={onClose}
      onSubmit={submit}
      open={open}
      submitDisabled={!name.trim()}
      submitLabel="Create group"
      testId={testIds.createGroupDialog}
      title="New group"
    >
      <FormField label="Name" maxLength={MAX_ORGANIZATION_NAME_LENGTH} required>
        <Input
          autoFocus
          data-testid={testIds.createGroupName}
          disabled={form.isPending}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. The Smiths"
          value={name}
        />
      </FormField>
    </FormDialog>
  );
}
