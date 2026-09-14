import { applyIdea } from './actions/apply-idea';
import { approveIdea } from './actions/approve-idea';
import type { UiTarget } from './interaction';

export async function approveAndApplyIdea(target: UiTarget): Promise<void> {
  await approveIdea(target);
  await applyIdea(target);
}
