import { render } from '@groam/vitest-config/react';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider
} from '@tanstack/react-router';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { Link } from '@/lib/navigation/link';

function nav() {
  return (
    <nav>
      <Link to="/settings">Settings</Link>
      <Link params={{ section: 'security' }} to="/settings/$section">
        Security
      </Link>
      <Link to="/trips">Trips</Link>
    </nav>
  );
}

test('only the link to the exact current path is marked current', async () => {
  const root = createRootRoute({ component: nav });
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ['/settings/security'] }),
    routeTree: root.addChildren([
      createRoute({ component: () => null, getParentRoute: () => root, path: '/settings' }),
      createRoute({
        component: () => null,
        getParentRoute: () => root,
        path: '/settings/$section'
      }),
      createRoute({ component: () => null, getParentRoute: () => root, path: '/trips' })
    ])
  });
  await render(<RouterProvider router={router} />);
  await expect
    .element(page.getByRole('link', { name: 'Security' }))
    .toHaveAttribute('aria-current', 'page');
  await expect
    .element(page.getByRole('link', { name: 'Settings' }))
    .not.toHaveAttribute('aria-current');
  await expect
    .element(page.getByRole('link', { name: 'Trips' }))
    .not.toHaveAttribute('aria-current');
});
