export type TripTabItem<Key extends string = string> = {
  /** Shown as "label (count)" when a count is given. */
  count?: number | string;
  key: Key;
  label: string;
  testId: string;
};

export type TripTabsProps<Key extends string = string> = {
  activeKey: Key;
  ariaLabel: string;
  disabled?: boolean;
  /** Optional real link per tab, so it can be opened in a new tab. */
  hrefFor?: (key: Key) => string | undefined;
  onOpen?: (key: Key) => void;
  tabs: ReadonlyArray<TripTabItem<Key>>;
};
