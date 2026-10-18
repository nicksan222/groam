import type { Reviewer } from '@/types/ideas';

export type { Reviewer };

export function filterReviewerOptions(reviewers: Reviewer[], query: string): Reviewer[] {
  const normalized = query.trim().toLocaleLowerCase();
  return reviewers.filter((reviewer) => reviewer.name.toLocaleLowerCase().includes(normalized));
}

export function reviewerKey(reviewer: Reviewer): string {
  return reviewer.kind === 'agent' ? reviewer.agentId : reviewer.userId;
}

export function reviewerIsSelected(selected: Reviewer[], reviewer: Reviewer): boolean {
  const key = reviewerKey(reviewer);
  return selected.some((item) => reviewerKey(item) === key);
}

export function toggleReviewerSelection(selected: Reviewer[], reviewer: Reviewer): Reviewer[] {
  const key = reviewerKey(reviewer);
  const retained = selected.filter((item) => reviewerKey(item) !== key);
  return retained.length === selected.length ? [...retained, reviewer] : retained;
}
