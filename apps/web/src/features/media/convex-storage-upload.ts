import type { Id } from '@groam/backend/data-model';
import { env } from '@groam/env/web-client';

export function storageIdFromUploadResponse(value: unknown): Id<'_storage'> {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('storageId' in value) ||
    typeof value.storageId !== 'string'
  ) {
    throw new Error('Convex returned an invalid upload response');
  }
  return value.storageId as Id<'_storage'>;
}

export async function uploadToConvexStorage(
  uploadUrl: string,
  file: File,
  contentType: string
): Promise<Response> {
  const target = new URL(uploadUrl);
  const deployment = new URL(env.convexUrl);
  if (
    target.origin !== deployment.origin ||
    target.pathname !== '/api/storage/upload' ||
    target.username !== '' ||
    target.password !== ''
  ) {
    throw new Error('The storage upload URL did not match the Convex deployment');
  }
  // fallow-ignore-next-line security-sink -- uploadUrl origin and path are validated against env.convexUrl before fetch
  return await fetch(target, {
    body: file,
    headers: { 'Content-Type': contentType },
    method: 'POST',
    redirect: 'error'
  });
}
