import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import Timeline from './index';

test('composes a compact timeline card without nested divider borders', () => {
  render(
    <Timeline>
      <Timeline.Item>
        <Timeline.Badge>AM</Timeline.Badge>
        <Timeline.Body>
          <Timeline.Card>
            <Timeline.CardHeader>Alex</Timeline.CardHeader>
            <Timeline.CardBody>Looks good</Timeline.CardBody>
            <Timeline.CardActions>Resolve conversation</Timeline.CardActions>
          </Timeline.Card>
        </Timeline.Body>
      </Timeline.Item>
    </Timeline>
  );

  expect(screen.getByRole('article').textContent).toContain('Looks good');
  expect(screen.getByText('Alex').className).not.toContain('border-b');
  expect(screen.getByText('Resolve conversation').className).not.toContain('border-t');
});

test('timeline card subparts expose stable data slots', () => {
  const { container } = render(
    <Timeline>
      <Timeline.Item>
        <Timeline.Body>
          <Timeline.Card>
            <Timeline.CardHeader>Header</Timeline.CardHeader>
            <Timeline.CardBody>Body</Timeline.CardBody>
            <Timeline.CardActions>Actions</Timeline.CardActions>
          </Timeline.Card>
        </Timeline.Body>
      </Timeline.Item>
    </Timeline>
  );

  expect(container.querySelector('[data-slot="timeline-card"]')).toBeTruthy();
  expect(container.querySelector('[data-slot="timeline-card-header"]')).toBeTruthy();
  expect(container.querySelector('[data-slot="timeline-card-body"]')).toBeTruthy();
  expect(container.querySelector('[data-slot="timeline-card-actions"]')).toBeTruthy();
});

test('applies shell card surfaces for dashboard cards', () => {
  const { container } = render(
    <Timeline>
      <Timeline.Item>
        <Timeline.Body>
          <Timeline.Card surface="lift">
            <Timeline.CardBody>Lift card</Timeline.CardBody>
          </Timeline.Card>
        </Timeline.Body>
      </Timeline.Item>
    </Timeline>
  );

  const card = container.querySelector('[data-slot="timeline-card"]');
  expect(card?.getAttribute('data-surface')).toBe('lift');
  expect(card?.className).toContain('dashboard-lift-card');
});
