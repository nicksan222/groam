import type { TripBoardAssignMode, TripBoardIssue } from '@/types/trip-board';

/**
 * How a card offers its assignee control. Viewers who cannot assign see a plain avatar (`static`).
 * Otherwise an assigned card shows its avatar as the picker trigger (`avatar`), and an unassigned
 * card keeps the trigger out of sight until hovered or focused (`hover`).
 */
export function assignMode(
  issue: Pick<TripBoardIssue, 'assignee' | 'canAssign'>
): TripBoardAssignMode {
  if (!issue.canAssign) return 'static';
  if (issue.assignee) return 'avatar';
  return 'hover';
}
