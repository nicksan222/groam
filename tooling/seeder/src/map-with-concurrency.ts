export async function mapWithConcurrency<Input, Output>(
  items: readonly Input[],
  concurrency: number,
  operation: (item: Input, index: number) => Promise<Output>
): Promise<Output[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error('Concurrency must be a positive integer');
  }

  const results = new Array<Output>(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      const item = items[index];
      if (item !== undefined) results[index] = await operation(item, index);
    }
  });
  await Promise.all(workers);
  return results;
}
