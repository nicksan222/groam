const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function pngBlob(): Blob {
  return new Blob([PNG_SIGNATURE, new Uint8Array([0, 0, 0, 0])], { type: 'image/png' });
}
