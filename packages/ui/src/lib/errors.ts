export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const fromData = convexErrorData(error);
    if (fromData) return fromData;

    const unwrapped = unwrapConvexServerError(error.message);
    if (unwrapped) return unwrapped;

    if (error.message && !isOpaqueServerError(error.message)) return error.message;
  }
  if (typeof error === 'string' && error.trim() && !isOpaqueServerError(error)) {
    return error.trim();
  }
  return fallback;
}

function convexErrorData(error: Error): string | null {
  if (!('data' in error)) return null;
  const data = (error as { data?: unknown }).data;
  if (typeof data === 'string' && data.trim() && !isRedacted(data)) return data.trim();
  return null;
}

/** Convex actions often wrap the real message as `… Server Error\nUncaught Error: …`. */
function unwrapConvexServerError(message: string): string | null {
  const match = message.match(/Uncaught (?:Error|ConvexError):\s*([\s\S]+)$/u);
  const extracted = match?.[1]?.split('\n')[0]?.trim();
  if (!extracted || isRedacted(extracted) || isOpaqueServerError(extracted)) return null;
  return extracted;
}

function isRedacted(message: string): boolean {
  return message === 'An error occurred.' || message === 'An error occurred';
}

function isOpaqueServerError(message: string): boolean {
  return isRedacted(message) || /\[CONVEX\s+[A-Z]/u.test(message) || /Server Error/iu.test(message);
}
