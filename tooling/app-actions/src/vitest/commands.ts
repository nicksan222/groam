import { defineBrowserCommand } from 'vite-plus/test/browser-playwright';
import type { BrowserCommand } from 'vite-plus/test/node';
import { photonResult, photonUrlPattern } from '#src/testing/photon';
import type { JourneyBackend } from './journey-backend';

type BackendArgs<Name extends keyof JourneyBackend> = JourneyBackend[Name] extends (
  testPath: string,
  ...args: infer Args
) => unknown
  ? Args
  : never;

// Vite loads this file natively, as part of the config, and Node cannot follow the backend's
// extensionless and `#src` imports. So the backend loads on first use through Vitest's own module
// runner (`project.import`), which resolves them like any other source.
function backendCommand<Name extends keyof JourneyBackend>(
  name: Name
): BrowserCommand<BackendArgs<Name>> {
  return defineBrowserCommand<BackendArgs<Name>>(async ({ project, testPath }, ...args) => {
    if (!testPath)
      throw new Error(`The ${name} command needs to know which journey file called it`);
    const { journeyBackend } = await project.import<{ journeyBackend: JourneyBackend }>(
      '@groam/app-actions/vitest/journey-backend'
    );
    // `name` is generic, so TypeScript cannot pair the function it picks with `args`.
    return Reflect.apply(journeyBackend[name], undefined, [testPath, ...args]);
  });
}

// Every backend arrangement a journey can make; the type keeps this list exhaustive.
const backendCommands: { [Name in keyof JourneyBackend]: BrowserCommand<BackendArgs<Name>> } = {
  account: backendCommand('account'),
  addMember: backendCommand('addMember'),
  approveIdea: backendCommand('approveIdea'),
  createInvitation: backendCommand('createInvitation'),
  createIssue: backendCommand('createIssue'),
  createTrip: backendCommand('createTrip'),
  redeemInvitation: backendCommand('redeemInvitation'),
  requestIdeaReview: backendCommand('requestIdeaReview'),
  startIdea: backendCommand('startIdea'),
  updateTrip: backendCommand('updateTrip')
};

// Playwright keeps every route handler it is given, so route each browser context only once.
const routedContexts = new WeakSet<object>();

/** Changes to the browser a real user could make; they run against the Playwright context. */
export const environmentCommands = {
  /** Lets the test page act as a user who allowed clipboard access. */
  allowClipboard: defineBrowserCommand(async ({ context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  }),
  /** Forgets cookies a previous test's session left in this file's browser. */
  clearCookies: defineBrowserCommand(async ({ context }) => {
    await context.clearCookies();
  }),
  /** Emulates the system color scheme; `null` restores the browser default. */
  emulateColorScheme: defineBrowserCommand<['dark' | 'light' | null]>(async ({ page }, scheme) => {
    await page.emulateMedia({ colorScheme: scheme });
  }),
  /** Answers destination search with fixed Portuguese cities instead of the live geocoder. */
  mockDestinationSearch: defineBrowserCommand(async ({ context }) => {
    if (routedContexts.has(context)) return;
    routedContexts.add(context);
    await context.route(photonUrlPattern, (route) => {
      const query = new URL(route.request().url()).searchParams.get('q') ?? '';
      return route.fulfill({ json: photonResult(query) });
    });
  })
};

/** Browser commands for journeys; tests call them through `arrange` and `environment`. */
export const journeyCommands = { ...backendCommands, ...environmentCommands };
