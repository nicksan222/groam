import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { EditorDayCardProps, EditorDetailSelection } from '@/types/itinerary-editor';
import { EditorInlineDetails } from './editor-inline-details';

vi.mock('./editor-activity-form', () => ({
  EditorActivityForm: (props: {
    destination: { name: string };
    onChooseDestination: (id: string) => void;
    onClose: () => void;
    selection: { activityId?: string };
  }) => (
    <section aria-label="Activity form stub">
      <p>
        {props.destination.name}:{props.selection.activityId ?? 'new'}
      </p>
      <button onClick={() => props.onChooseDestination('porto')} type="button">
        choose porto
      </button>
      <button onClick={props.onClose} type="button">
        close activity
      </button>
    </section>
  )
}));
vi.mock('./editor-stay-form', () => ({
  EditorStayForm: (props: {
    destination: { name: string };
    onChooseDestination: (id: string) => void;
    onClose: () => void;
    stayId?: string;
  }) => (
    <section aria-label="Stay form stub">
      <p>
        {props.destination.name}:{props.stayId ?? 'new'}
      </p>
      <button onClick={() => props.onChooseDestination('porto')} type="button">
        choose porto
      </button>
      <button onClick={props.onClose} type="button">
        close stay
      </button>
    </section>
  )
}));
vi.mock('./editor-travel-form', () => ({
  EditorTravelForm: (props: { onClose: () => void; target: { kind: string } }) => (
    <section aria-label="Travel form stub">
      <p>{props.target.kind}</p>
      <button onClick={props.onClose} type="button">
        close travel
      </button>
    </section>
  )
}));
vi.mock('./editor-travel-choices', () => ({
  EditorTravelChoices: (props: {
    day: number;
    onChoose: (target: unknown) => void;
    onClose: () => void;
  }) => (
    <section aria-label="Travel choices stub">
      <p>day {props.day}</p>
      <button onClick={() => props.onChoose({ kind: 'arrival' })} type="button">
        pick arrival
      </button>
      <button onClick={props.onClose} type="button">
        close choices
      </button>
    </section>
  )
}));

const lisbon = { activities: [], endDay: 3, id: 'lisbon', name: 'Lisbon', startDay: 1, stays: [] };
const porto = { activities: [], endDay: 3, id: 'porto', name: 'Porto', startDay: 1, stays: [] };

function renderDetails(overrides: Partial<EditorDayCardProps> = {}) {
  const props = {
    day: { day: 2, destinations: [], entries: [], stays: [] },
    detail: null,
    onAdd: vi.fn(),
    onAddDestination: vi.fn(),
    onEdit: vi.fn(),
    props: { activityActions: {}, stayActions: {}, trip: { destinations: [lisbon, porto] } },
    selection: null,
    setDetail: vi.fn(),
    setSelection: vi.fn(),
    setUploading: vi.fn(),
    uploading: false,
    ...overrides
  } as unknown as EditorDayCardProps;
  return { props, result: render(<EditorInlineDetails {...props} />) };
}

describe('activity selection', () => {
  test('shows the activity form for the selected destination and updates the selection', async () => {
    const selection = { day: 2, destinationId: 'lisbon', period: 'morning' } as never;
    const { props, result } = renderDetails({ selection });
    await result;
    await expect
      .element(page.getByRole('region', { name: 'Activity form stub' }).getByText('Lisbon:new'))
      .toBeVisible();
    await page.getByRole('button', { name: 'choose porto' }).click();
    const update = vi.mocked(props.setSelection).mock.calls[0][0] as (...a: unknown[]) => unknown;
    expect(update).toEqual({ ...(selection as object), destinationId: 'porto' });
  });

  test('closing clears only the same selection', async () => {
    const selection = { day: 2, destinationId: 'lisbon', period: 'morning' } as never;
    const { props, result } = renderDetails({ selection });
    await result;
    await page.getByRole('button', { name: 'close activity' }).click();
    const reducer = vi.mocked(props.setSelection).mock.calls[0][0] as unknown as (
      current: unknown
    ) => unknown;
    expect(reducer(selection)).toBeNull();
    expect(reducer({ other: true })).toEqual({ other: true });
  });

  test.each([
    ['another day', { day: 5, destinationId: 'lisbon', period: 'morning' }],
    ['an unknown destination', { day: 2, destinationId: 'nowhere', period: 'morning' }]
  ])('renders nothing for a selection on %s', async (_, selection) => {
    await renderDetails({ selection: selection as never }).result;
    await expect.element(page.getByRole('region')).not.toBeInTheDocument();
  });
});

describe('detail selection', () => {
  test('shows the stay form and switches destination', async () => {
    const detail: EditorDetailSelection = {
      day: 2,
      destinationId: 'lisbon' as never,
      kind: 'stay',
      stayId: 'hotel' as never
    };
    const { props, result } = renderDetails({ detail });
    await result;
    await expect
      .element(page.getByRole('region', { name: 'Stay form stub' }).getByText('Lisbon:hotel'))
      .toBeVisible();
    await page.getByRole('button', { name: 'choose porto' }).click();
    expect(props.setDetail).toHaveBeenCalledWith({ ...detail, destinationId: 'porto' });
  });

  test('renders nothing for a stay in an unknown destination', async () => {
    await renderDetails({ detail: { day: 2, destinationId: 'x' as never, kind: 'stay' } }).result;
    await expect.element(page.getByRole('region')).not.toBeInTheDocument();
  });

  test('shows the travel form for a travel selection', async () => {
    await renderDetails({ detail: { day: 2, kind: 'travel', target: { kind: 'departure' } } })
      .result;
    await expect
      .element(page.getByRole('region', { name: 'Travel form stub' }).getByText('departure'))
      .toBeVisible();
  });

  test('moves from travel choices to the chosen travel form', async () => {
    const { props, result } = renderDetails({ detail: { day: 2, kind: 'travel-choices' } });
    await result;
    await expect
      .element(page.getByRole('region', { name: 'Travel choices stub' }).getByText('day 2'))
      .toBeVisible();
    await page.getByRole('button', { name: 'pick arrival' }).click();
    expect(props.setDetail).toHaveBeenCalledWith({
      day: 2,
      kind: 'travel',
      target: { kind: 'arrival' }
    });
    await page.getByRole('button', { name: 'close choices' }).click();
    expect(props.setDetail).toHaveBeenLastCalledWith(null);
  });

  test.each([
    ['no selection', {}],
    ['a route detail', { detail: { day: 2, destinationId: 'lisbon', kind: 'route' } }],
    ['a detail on another day', { detail: { day: 9, kind: 'travel-choices' } }]
  ])('renders nothing for %s', async (_, overrides) => {
    await renderDetails(overrides as never).result;
    await expect.element(page.getByRole('region')).not.toBeInTheDocument();
  });
});
