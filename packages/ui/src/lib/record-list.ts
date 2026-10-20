/** A record title doubles as a full-row hit target; trailing controls sit above it. */
export const recordListTitleClassName =
  'line-clamp-2 min-w-0 w-full text-left text-base leading-5 font-semibold text-foreground underline-offset-4 outline-none after:absolute after:inset-0 hover:text-primary focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring md:block md:truncate md:text-base md:leading-6';

export type RecordListSort<T> = {
  compare?: (a: T, b: T) => number;
  label: string;
  value: string;
};
