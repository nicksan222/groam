import { type UiTarget, ui } from './interaction';

export async function searchIssues(target: UiTarget, query: string): Promise<void> {
  const user = ui(target);
  await user.type(user.page.getByRole('searchbox', { name: 'Search issues' }), query);
}
