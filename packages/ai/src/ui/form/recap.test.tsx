import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { AssistantRecap } from './recap';

test('renders a compact recap with verified highlights', async () => {
  await render(
    <AssistantRecap
      emit={() => {}}
      on={() => ({ bound: false, emit: () => {}, shouldPreventDefault: false })}
      props={{
        highlights: ['3 stops planned', '2 decisions need approval'],
        summary: 'Your Portugal route is ready for a group review.',
        title: 'Portugal recap',
        tone: 'positive'
      }}
    />
  );

  await expect.element(page.getByText('Portugal recap')).toBeInTheDocument();
  await expect.element(page.getByText('3 stops planned')).toBeInTheDocument();
  await expect.element(page.getByText('2 decisions need approval')).toBeInTheDocument();
});
