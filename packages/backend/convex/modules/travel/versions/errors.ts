/** Map internal Git engine failures to product-facing idea errors before clients see them. */
function rethrowAsIdeaError(error: unknown): never {
  if (!(error instanceof Error)) throw error;
  const { message } = error;
  if (message.startsWith('Unable to automatically combine ')) throw error;
  if (/\bGit\b/u.test(message)) {
    throw new Error('Unable to process change history for this idea');
  }
  throw error;
}

/** Product-facing errors for idea Git history. */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class IdeaErrors {
  static rethrow = rethrowAsIdeaError;
}
