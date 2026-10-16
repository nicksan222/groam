import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { TripDestinationsMap } from './trip-destinations-map';

vi.mock('react-map-gl/maplibre', () => ({
  Layer: () => <i data-testid="route-layer" />,
  Marker: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  NavigationControl: () => null,
  Popup: ({ children, onClose }: { children: ReactNode; onClose: () => void }) => (
    <aside aria-label="Stop popup">
      {children}
      <button onClick={onClose} type="button">
        Close popup
      </button>
    </aside>
  ),
  Source: ({ children }: { children: ReactNode }) => (
    <div data-testid="route-source">{children}</div>
  ),
  default: ({ children, onError }: { children: ReactNode; onError: () => void }) => (
    <div data-testid="map">
      <button onClick={onError} type="button">
        Fail tiles
      </button>
      {children}
    </div>
  )
}));

type MapDestination = Parameters<typeof TripDestinationsMap>[0]['destinations'][number];

function makeStop(overrides: Partial<MapDestination> & Pick<MapDestination, 'id' | 'name'>) {
  return {
    endDay: null,
    latitude: 38.72,
    longitude: -9.14,
    startDay: null,
    ...overrides
  } as unknown as MapDestination;
}

const lisbon = makeStop({ endDay: 3, id: 'lisbon', name: 'Lisbon', startDay: 1 });
const porto = makeStop({ id: 'porto', latitude: 41.15, longitude: -8.61, name: 'Porto' });

describe('TripDestinationsMap', () => {
  test('explains the empty route and hides map chrome', async () => {
    await render(<TripDestinationsMap destinations={[]} />);
    await expect.element(page.getByText('Your route will appear here')).toBeVisible();
    await expect.element(page.getByText('Interactive street map')).not.toBeInTheDocument();
  });

  test('numbers markers in route order', async () => {
    await render(<TripDestinationsMap destinations={[lisbon, porto]} />);
    await expect
      .element(page.getByRole('button', { name: 'Show Lisbon on map' }))
      .toHaveTextContent('1');
    await expect
      .element(page.getByRole('button', { name: 'Show Porto on map' }))
      .toHaveTextContent('2');
    await expect.element(page.getByText('Interactive street map')).toBeVisible();
  });

  test.each([
    ['one stop', [lisbon], false],
    ['two stops', [lisbon, porto], true]
  ])('draws the route line for %s: %s', async (_, destinations, drawn) => {
    await render(<TripDestinationsMap destinations={destinations} />);
    const route = page.getByTestId('route-source');
    if (drawn) await expect.element(route).toBeInTheDocument();
    else await expect.element(route).not.toBeInTheDocument();
  });

  test.each([
    ['a scheduled stop', lisbon, 'Days 1–3'],
    ['an unscheduled stop', porto, 'Schedule not set']
  ])('opens a popup for %s and closes it', async (_, stop, summary) => {
    await render(<TripDestinationsMap destinations={[lisbon, porto]} />);
    await page.getByRole('button', { name: `Show ${stop.name} on map` }).click();
    const popup = page.getByRole('complementary', { name: 'Stop popup' });
    await expect.element(popup.getByText(stop.name)).toBeVisible();
    await expect.element(popup.getByText(summary)).toBeVisible();
    await page.getByRole('button', { name: 'Close popup' }).click();
    await expect.element(popup).not.toBeInTheDocument();
  });

  test('warns when map tiles fail but keeps destinations', async () => {
    await render(<TripDestinationsMap destinations={[lisbon]} />);
    await expect.element(page.getByTestId('trip-map-offline')).not.toBeInTheDocument();
    await page.getByRole('button', { name: 'Fail tiles' }).click();
    await expect.element(page.getByText(/Map tiles are unavailable/u)).toBeVisible();
  });

  test('does not show the tile warning without destinations', async () => {
    await render(<TripDestinationsMap destinations={[]} />);
    (page.getByRole('button', { name: 'Fail tiles' }).element() as HTMLButtonElement).click();
    await expect.element(page.getByText(/Map tiles are unavailable/u)).not.toBeInTheDocument();
  });

  test('renders in compact mode', async () => {
    await render(<TripDestinationsMap compact destinations={[lisbon]} />);
    await expect.element(page.getByTestId('map')).toBeInTheDocument();
  });
});
