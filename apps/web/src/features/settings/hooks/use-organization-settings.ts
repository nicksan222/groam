import { authClient } from '@groam/auth/client';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { ActiveOrganization } from '@/features/workspace/workspace-shell/workspace-state';
import { errorMessage } from '@/lib/errors';
import { useOrganizationSettingsStore } from '@/lib/stores/settings-stores';
import { useOrganizationLogo } from './use-organization-logo';

export function useOrganizationSettings(organization: ActiveOrganization) {
  const logo = useOrganizationLogo(organization.id);
  const state = useOrganizationSettingsStore(
    useShallow((store) => ({
      error: store.error,
      isPending: store.isPending,
      logo: store.logo,
      message: store.message,
      name: store.name,
      slug: store.slug
    }))
  );
  const patch = useOrganizationSettingsStore((store) => store.patch);
  const resetFromOrganization = useOrganizationSettingsStore(
    (store) => store.resetFromOrganization
  );

  useEffect(() => {
    resetFromOrganization(organization);
  }, [organization, resetFromOrganization]);

  const run = async (
    action: () => Promise<void>,
    failureMessage: string,
    successMessage?: string
  ) => {
    patch({ error: null, isPending: true, message: null });
    try {
      await action();
      patch({ message: successMessage ?? null });
    } catch (error: unknown) {
      patch({ error: errorMessage(error, failureMessage) });
    } finally {
      patch({ isPending: false });
    }
  };

  const save = () =>
    run(
      async () => {
        const result = await authClient.organization.update({
          data: {
            name: state.name.trim(),
            slug: state.slug.trim()
          },
          organizationId: organization.id
        });
        if (result.error) throw new Error(result.error.message ?? 'Unable to update group');
      },
      'Unable to update group',
      'Group settings saved.'
    );

  const uploadLogo = (file: File) =>
    run(
      async () => {
        const url = await logo.upload(file);
        patch({ logo: url });
      },
      'Unable to update group logo',
      'Group logo updated.'
    );

  const clearLogo = () =>
    run(
      async () => {
        await logo.clear();
        patch({ logo: '' });
      },
      'Unable to remove group logo',
      'Group logo removed.'
    );

  const remove = () => run(() => removeOrganization(organization.id), 'Unable to delete group');

  return { clearLogo, remove, save, state, updateState: patch, uploadLogo };
}

async function removeOrganization(organizationId: string) {
  const organizations = await authClient.organization.list();
  if (organizations.error) throw new Error(organizations.error.message ?? 'Unable to list groups');
  const fallback = organizations.data?.find(({ id }) => id !== organizationId);
  if (fallback) await activateOrganization(fallback.id);
  const result = await authClient.organization.delete({ organizationId });
  if (result.error) throw new Error(result.error.message ?? 'Unable to delete group');
}

async function activateOrganization(organizationId: string) {
  const activation = await authClient.organization.setActive({ organizationId });
  if (activation.error) throw new Error(activation.error.message ?? 'Unable to switch groups');
}
