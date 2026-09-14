import { authClient } from '@groam/auth/client';
import { api } from '@groam/backend/api';
import { useMutation } from 'convex/react';
import { useCallback } from 'react';
import { useMediaUpload } from '@/features/media/hooks/use-media-upload';

export function useOrganizationLogo(organizationId: string) {
  const uploadMedia = useMediaUpload();
  const setLogo = useMutation(api.routes.media.logo.set.run);
  const clearLogo = useMutation(api.routes.media.logo.clear.run);

  const upload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) throw new Error('Choose an image for the group logo');
      const mediaId = await uploadMedia(file, null);
      if (!mediaId) throw new Error('Unable to upload group logo');

      const result = await setLogo({ mediaId });
      // The Convex mutation is authoritative and owns the media reference. Repeating the
      // Better Auth update here refreshes its browser-side organization stores immediately.
      await authClient.organization.update({
        data: { logo: result.url },
        organizationId
      });
      return result.url;
    },
    [organizationId, setLogo, uploadMedia]
  );

  const clear = useCallback(async () => {
    await clearLogo({});
    await authClient.organization.update({ data: { logo: null }, organizationId });
  }, [clearLogo, organizationId]);

  return { clear, upload };
}
