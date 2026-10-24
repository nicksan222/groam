import { page } from 'vite-plus/test/browser';
import { enter } from './queries';

export async function searchTrips(query: string): Promise<void> {
  await enter(page.getByRole('searchbox', { name: 'Search trips' }), query);
}
