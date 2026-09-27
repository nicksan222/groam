import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { AssistantRecap } from './recap';

test('renders a compact recap with verified highlights', () => {
  render(
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

  expect(screen.getByText('Portugal recap')).toBeDefined();
  expect(screen.getByText('3 stops planned')).toBeDefined();
  expect(screen.getByText('2 decisions need approval')).toBeDefined();
});
