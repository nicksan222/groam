import type { Id } from '#convex-generated/dataModel';

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const SIGNATURE_BYTES = 16;

type FileCategory = 'audio' | 'document' | 'image' | 'video';

export type InspectedStorageFile = {
  contentType: string;
  signatureValid: boolean;
};

type ReadableFileStorage = {
  get: (storageId: Id<'_storage'>) => Promise<Blob | null>;
};

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.subarray(start, end));
}

function startsWith(bytes: Uint8Array, prefix: readonly number[]): boolean {
  return prefix.every((byte, index) => bytes[index] === byte);
}

function hasFtyp(bytes: Uint8Array, brands?: readonly string[]): boolean {
  if (ascii(bytes, 4, 8) !== 'ftyp') return false;
  return brands === undefined || brands.includes(ascii(bytes, 8, 12));
}

function isEbml(bytes: Uint8Array): boolean {
  return startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3]);
}

function isRiff(bytes: Uint8Array, form: string): boolean {
  return ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === form;
}

const FILE_KINDS: Record<
  string,
  { category: FileCategory; matches: (bytes: Uint8Array) => boolean }
> = {
  'application/pdf': { category: 'document', matches: (bytes) => ascii(bytes, 0, 5) === '%PDF-' },
  'audio/mpeg': {
    category: 'audio',
    matches: (bytes) =>
      ascii(bytes, 0, 3) === 'ID3' ||
      (bytes[0] === 0xff && bytes[1] !== undefined && (bytes[1] & 0xe0) === 0xe0)
  },
  'audio/ogg': { category: 'audio', matches: (bytes) => ascii(bytes, 0, 4) === 'OggS' },
  'audio/wav': { category: 'audio', matches: (bytes) => isRiff(bytes, 'WAVE') },
  'audio/mp4': { category: 'audio', matches: (bytes) => hasFtyp(bytes) },
  'audio/webm': { category: 'audio', matches: isEbml },
  'image/avif': { category: 'image', matches: (bytes) => hasFtyp(bytes, ['avif', 'avis']) },
  'image/gif': {
    category: 'image',
    matches: (bytes) => {
      const header = ascii(bytes, 0, 6);
      return header === 'GIF87a' || header === 'GIF89a';
    }
  },
  'image/jpeg': { category: 'image', matches: (bytes) => startsWith(bytes, [0xff, 0xd8, 0xff]) },
  'image/png': {
    category: 'image',
    matches: (bytes) => startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  },
  'image/webp': { category: 'image', matches: (bytes) => isRiff(bytes, 'WEBP') },
  'video/mp4': { category: 'video', matches: (bytes) => hasFtyp(bytes) },
  'video/quicktime': { category: 'video', matches: (bytes) => hasFtyp(bytes) },
  'video/webm': { category: 'video', matches: isEbml }
};

export const Files = {
  supportedContentTypes: new Set(Object.keys(FILE_KINDS)) as ReadonlySet<string>,

  normalizeContentType(contentType: string): string {
    return contentType.split(';', 1)[0]?.trim().toLowerCase() ?? '';
  },

  isImage(contentType: string): boolean {
    return FILE_KINDS[contentType]?.category === 'image';
  },

  hasValidSignature(bytes: Uint8Array, contentType: string): boolean {
    return FILE_KINDS[contentType]?.matches(bytes) ?? false;
  },

  validationError(size: number, contentType: string, signatureValid: boolean): string | null {
    if (size > MAX_FILE_SIZE) return 'Files must be 25 MB or smaller';
    if (!(contentType in FILE_KINDS)) return 'Upload a supported image, video, audio file, or PDF';
    return signatureValid ? null : 'The file contents do not match its media type';
  },

  async readSignature(blob: Blob | null, byteLimit = SIGNATURE_BYTES): Promise<Uint8Array> {
    if (!blob) return new Uint8Array();
    return new Uint8Array(await blob.slice(0, byteLimit).arrayBuffer());
  },

  async inspect(
    ctx: { storage: ReadableFileStorage },
    storageId: Id<'_storage'>,
    fallbackContentType = ''
  ): Promise<InspectedStorageFile> {
    const blob = await ctx.storage.get(storageId);
    const contentType = Files.normalizeContentType(blob?.type || fallbackContentType);
    const signature = await Files.readSignature(blob);
    return { contentType, signatureValid: Files.hasValidSignature(signature, contentType) };
  }
};
