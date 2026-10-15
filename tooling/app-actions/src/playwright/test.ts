import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { test as base, type BrowserContext, type Page } from '@playwright/test';
import type { CreateIssueInput } from '#src/actions/create-issue';
import type { CreateTripInput } from '#src/actions/create-trip';
import type { UpdateTripInput } from '#src/actions/update-trip';
import type { StartedIdea } from '#src/backend/add-idea';
import { signInAs } from './sign-in-as';
import type { TestUserCredentials } from './unique-test-user';
import {
  addWorkspaceMember,
  createE2eBackend,
  createWorkerAccount,
  type WorkerAccount
} from './worker-account';

/** Backend shortcuts for arranging data that a test does not exercise through the UI. */
export type Arrange = {
  addMember(prefix?: string): Promise<TestUserCredentials>;
  createIssue(input: CreateIssueInput & { tripId: string }): Promise<string>;
  createTrip(input: CreateTripInput): Promise<string>;
  requestIdeaReview(proposalId: string): Promise<void>;
  startIdea(input: { name: string; tripId: string }): Promise<StartedIdea>;
  /** Pass an idea's `workingTripId` to edit the idea instead of the shared trip. */
  updateTrip(input: UpdateTripInput & { tripId: string }): Promise<void>;
};

type TestFixtures = {
  arrange: Arrange;
  /** Opens a page in a fresh signed-out context; it closes with the test. */
  newSignedOutPage: () => Promise<Page>;
};

type WorkerFixtures = {
  account: WorkerAccount;
  workerStorageState: string;
};

/**
 * Playwright `test` whose `page` is already signed in as the worker's own account and group.
 * Each worker signs in once and reuses that session; specs that exercise sign-up or sign-in
 * themselves use plain `@playwright/test` instead.
 */
export const test = base.extend<TestFixtures, WorkerFixtures>({
  account: [
    // oxlint-disable-next-line no-empty-pattern -- Playwright reads fixture dependencies from this pattern
    async ({}, provide, workerInfo) => {
      await provide(await createWorkerAccount(createE2eBackend(), workerInfo.parallelIndex));
    },
    { scope: 'worker' }
  ],
  arrange: async ({ account }, provide) => {
    const { backend, user } = account;
    await provide({
      addMember: (prefix) => addWorkspaceMember(account, prefix),
      createIssue: (input) => backend.createIssue(user, input),
      createTrip: (input) => backend.createTrip(user, input),
      requestIdeaReview: (proposalId) => backend.requestIdeaReview(user, { proposalId }),
      startIdea: (input) => backend.startIdea(user, input),
      updateTrip: (input) => backend.updateTrip(user, input)
    });
  },
  newSignedOutPage: async ({ browser }, provide) => {
    const contexts: BrowserContext[] = [];
    await provide(async () => {
      const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
      contexts.push(context);
      return context.newPage();
    });
    await Promise.all(contexts.map((context) => context.close()));
  },
  storageState: ({ workerStorageState }, provide) => provide(workerStorageState),
  workerStorageState: [
    async ({ account, browser }, provide, workerInfo) => {
      const file = path.join(
        workerInfo.project.outputDir,
        '.auth',
        `worker-${workerInfo.parallelIndex}.json`
      );
      await mkdir(path.dirname(file), { recursive: true });
      const context = await browser.newContext({
        baseURL: workerInfo.project.use.baseURL,
        storageState: undefined
      });
      const page = await context.newPage();
      await signInAs(page, account.credentials);
      await context.storageState({ path: file });
      await context.close();
      await provide(file);
    },
    { scope: 'worker' }
  ]
});

export { expect } from '@playwright/test';
