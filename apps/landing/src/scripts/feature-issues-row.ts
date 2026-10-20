import { issueTick } from '@groam/icons/markup';
import type { ExampleIssue } from '@/content/feature-issues';
import { translateHtml } from '@/i18n/runtime';

export type IssueState = 'open' | 'fix' | 'closed';

/** Markup for the line under an issue title; shared by the server render and the player. */
export function fixHtml(issue: ExampleIssue, state: IssueState): string {
  if (state === 'open') return translateHtml('<p class="fi-fix fi-empty">No idea linked yet</p>');
  const chip =
    state === 'fix'
      ? '<span class="chip chip-idea">Idea linked</span>'
      : '<span class="chip chip-done">Closed</span>';
  return translateHtml(`<p class="fi-fix strip">${chip}<span>${issue.idea}</span></p>`);
}

export function rowHtml(key: number, issue: ExampleIssue, state: IssueState): string {
  return translateHtml(
    `<li class="fi-row" data-key="${key}" data-state="${state}"><span class="fi-tick">${issueTick}</span><div class="fi-text"><p class="fi-title">${issue.title}</p>${fixHtml(issue, state)}</div><span class="fi-stamp" aria-hidden="true">Closed</span></li>`
  );
}
