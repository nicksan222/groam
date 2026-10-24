export type RecordListSort<T> = {
  compare?: (a: T, b: T) => number;
  label: string;
  value: string;
};
