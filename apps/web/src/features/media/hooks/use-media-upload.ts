import { api } from '@groam/backend/api';
import { toast } from '@groam/ui/components/toast';
import { useAction, useMutation } from 'convex/react';
import { useCallback } from 'react';
import {
  storageIdFromUploadResponse,
  uploadToConvexStorage
} from '@/features/media/convex-storage-upload';
import { mediaValidationError } from '@/features/media/media-validation';
import { errorMessage } from '@/lib/errors';

export function useMediaUpload() {
  const generateUploadUrl = useMutation(api.routes.media.upload.run);
  const save = useAction(api.routes.media.save.run);

  return useCallback(
    async (
      file: File,
      successMessage: null | string = `${file.name} uploaded`,
      onError?: (message: string) => void
    ) => {
      const fail = (message: string) => {
        toast.error(message);
        onError?.(message);
        return null;
      };

      const validationError = mediaValidationError(file);
      if (validationError) return fail(validationError);

      try {
        const uploadUrl = await generateUploadUrl({});
        const response = await uploadToConvexStorage(
          uploadUrl,
          file,
          file.type || 'application/octet-stream'
        );
        if (!response.ok) throw new Error(`Upload failed with status ${response.status}`);

        const storageId = storageIdFromUploadResponse(await response.json());
        const result = await save({ contentType: file.type, name: file.name, storageId });
        if (!result.ok) return fail(result.error);
        if (successMessage) toast.success(successMessage);
        return result.mediaId;
      } catch (error: unknown) {
        return fail(errorMessage(error, 'Unable to upload media'));
      }
    },
    [generateUploadUrl, save]
  );
}
