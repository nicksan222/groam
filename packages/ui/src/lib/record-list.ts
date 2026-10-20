/** A record title doubles as a full-row hit target; trailing controls sit above it. */
export const recordListTitleClassName =
  'block min-w-0 w-full truncate text-left text-sm leading-6 font-semibold text-foreground underline-offset-4 outline-none after:absolute after:inset-0 hover:text-primary focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring sm:text-base';

export type RecordListSort<T> = {
  compare?: (a: T, b: T) => number;
  label: string;
  value: string;
};
