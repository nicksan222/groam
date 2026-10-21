export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
}

/** Where email links return: the current page, without its query. */
export function emailCallbackURL(): string {
  return window.location.origin + window.location.pathname;
}
