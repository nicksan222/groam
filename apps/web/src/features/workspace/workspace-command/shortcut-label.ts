/** Platform modifier for shortcut hints: ⌘ on Apple devices, Ctrl elsewhere. */
export function modifierKeyLabel() {
  if (typeof navigator === 'undefined') return 'Ctrl';
  return /Mac|iPhone|iPad|iPod/u.test(navigator.platform || navigator.userAgent) ? '⌘' : 'Ctrl';
}
