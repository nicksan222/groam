/** PNG's IHDR records physical pixel dimensions, independently of the CSS viewport. */
export function assertPngSize(bytes: Buffer, expected: { width: number; height: number }) {
  if (bytes.length < 24 || bytes.readUInt32BE(0) !== 0x89504e47) {
    throw new Error('Chromium returned a non-PNG frame.');
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width !== expected.width || height !== expected.height) {
    throw new Error(
      `Capture was resized to ${width}×${height}; expected ${expected.width}×${expected.height}. Refusing a blurry recording.`
    );
  }
}
