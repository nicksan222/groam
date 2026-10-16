import { page } from 'vite-plus/test/browser';
import { enter } from './queries';

export async function searchTrips(query: string): Promise<void> {
  await enter(page.getByRole('searchbox', { name: 'Search trips' }), query);
}

export async function searchIdeas(query: string): Promise<void> {
  await enter(page.getByRole('searchbox', { name: 'Search ideas' }), query);
}

export async function searchIssues(query: string): Promise<void> {
  await enter(page.getByRole('searchbox', { name: 'Search issues' }), query);
}
