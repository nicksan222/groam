const recordListTitleBaseClassName =
  'min-w-0 w-full text-left text-base leading-5 font-semibold text-foreground underline-offset-4 outline-none after:absolute after:inset-0 hover:text-primary focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring @md/record:leading-6';

/** A record title doubles as a full-row hit target; trailing controls sit above it. */
export const recordListTitleClassName = `${recordListTitleBaseClassName} line-clamp-2 @md/record:block @md/record:truncate`;

/** Pair with RecordListItem's wrapTitle to show the full title at a readable measure. */
export const recordListWrappedTitleClassName = `${recordListTitleBaseClassName} block max-w-[60ch] whitespace-normal wrap-anywhere`;

export type RecordListSort<T> = {
  compare?: (a: T, b: T) => number;
  label: string;
  value: string;
};
