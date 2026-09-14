import { authClient } from '@groam/auth/client';
import { FormDialog } from '@groam/ui/components/form-dialog';
import { FormField } from '@groam/ui/components/form-field';
import { Input } from '@groam/ui/components/input';
import { type FormEvent, useState } from 'react';
import { useRequestState } from '@/features/workspace/hooks/use-request-state';
import { createSlug } from '@/features/workspace/workspace-shell/workspace-state';
import { errorMessage } from '@/lib/errors';
import { testIds } from '@/lib/test-ids';
import type { WorkspaceDialogControlProps } from './types';

export function CreateOrganizationDialog({ onClose, open }: WorkspaceDialogControlProps) {
  const [name, setName] = useState('');
  const [request, setRequest] = useRequestState();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedName = name.trim();
    if (!normalizedName) return;
    setRequest({ error: null, isPending: true });
    try {
      const result = await authClient.organization.create({
        name: normalizedName,
        slug: createSlug(normalizedName)
      });
      if (result.error) throw new Error(result.error.message ?? 'Unable to create group');
      setName('');
      onClose();
    } catch (error: unknown) {
      setRequest({ error: errorMessage(error, 'Unable to create group'), isPending: false });
      return;
    }
    setRequest({ error: null, isPending: false });
  };

  return (
    <FormDialog
      description="Create an isolated group with its own members and trips."
      error={request.error}
      isPending={request.isPending}
      onClose={onClose}
      onSubmit={(event) => void submit(event)}
      open={open}
      submitLabel="Create group"
      testId={testIds.createGroupDialog}
      title="New group"
    >
      <FormField label="Name">
        <Input
          autoFocus
          data-testid={testIds.createGroupName}
          disabled={request.isPending}
          onChange={(event) => setName(event.target.value)}
          placeholder="The Smiths"
          required
          value={name}
        />
      </FormField>
    </FormDialog>
  );
}
