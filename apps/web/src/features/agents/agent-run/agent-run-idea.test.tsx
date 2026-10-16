import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import { AgentRunIdea } from './agent-run-idea';

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const navigate = vi.fn();
  return {
    ...(await importOriginal<typeof import('@tanstack/react-router')>()),
    Link: ({
      children,
      className,
      params,
      to
    }: {
      children?: ReactNode;
      className?: string;
      params?: Record<string, string>;
      to: string;
    }) => {
      let href = to;
      for (const [key, value] of Object.entries(params ?? {})) {
        href = href.replace(`$${key}`, value);
      }
      return (
        <a className={className} href={href} onClick={(event) => event.preventDefault()}>
          {children}
        </a>
      );
    },
    useNavigate: () => navigate
  };
});

const ids = { proposalId: 'prop-1' as never, tripId: 'trip-1' as never };

describe('AgentRunIdea', () => {
  test('shows the idea title and links to the idea', async () => {
    await render(
      <ol>
        <AgentRunIdea ideaTitle="Add Porto" {...ids} />
      </ol>
    );
    await expect.element(page.getByTestId(testIds.agentRunIdea)).toBeVisible();
    await expect.element(page.getByText('Related idea')).toBeVisible();
    await expect.element(page.getByText('Add Porto')).toBeVisible();
    await expect
      .element(page.getByRole('link', { name: 'Open idea' }))
      .toHaveAttribute('href', expect.stringContaining('/trips/trip-1/ideas/prop-1/'));
  });

  test('falls back to "Untitled idea"', async () => {
    await render(
      <ol>
        <AgentRunIdea ideaTitle={null} {...ids} />
      </ol>
    );
    await expect.element(page.getByText('Untitled idea')).toBeVisible();
  });
});
