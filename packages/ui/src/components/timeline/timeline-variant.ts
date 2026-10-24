export type TimelineVariant = 'default' | 'minimal' | 'activity' | 'route';

export function isMinimalTimelineVariant(variant: TimelineVariant): boolean {
  return variant === 'minimal';
}
