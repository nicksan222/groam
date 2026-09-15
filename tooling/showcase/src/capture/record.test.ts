import { mkdtemp, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { errors, expect as expectPage } from '@playwright/test';
import { expect, it, vi } from 'vitest';
import { assertPngSize } from '#src/capture/png';
import { recordScenario } from '#src/capture/record';

it('captures two isolated browsers observing the same update and finalizes every frame', async () => {
  let shared = '';
  let screenshotAttempts = 0;
  const server = createServer((request, response) => {
    if (request.url === '/send') shared = 'Lisbon together';
    if (request.url === '/state' || request.url === '/send') {
      response.setHeader('Content-Type', 'text/plain');
      response.end(shared);
      return;
    }
    response.setHeader('Content-Type', 'text/html');
    response.end(
      '<html><body><button>Suggest Lisbon</button><p id="message"></p><script>document.querySelector("button").onclick=()=>fetch("/send");setInterval(async()=>{document.querySelector("p").textContent=await(await fetch("/state")).text()},100)</script></body></html>'
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test server address');
  const publicDir = await mkdtemp(join(tmpdir(), 'groam-showcase-test-'));
  try {
    const capture = await recordScenario(
      {
        id: 'test',
        actors: [
          { id: 'owner', label: 'Owner', role: 'Organizer' },
          { id: 'member', label: 'Member', role: 'Traveler' }
        ],
        async prepare(pages) {
          const screenshot = pages.owner.screenshot.bind(pages.owner);
          vi.spyOn(pages.owner, 'screenshot').mockImplementation((options) => {
            if (++screenshotAttempts === 2)
              return Promise.reject(new errors.TimeoutError('Navigation interrupted capture'));
            return screenshot(options);
          });
          await Promise.all(Object.values(pages).map((page) => page.goto('/')));
          expect(pages.owner.context()).not.toBe(pages.member.context());
          expect(pages.owner.viewportSize()).toEqual({ width: 1920, height: 1080 });
          expect(await pages.owner.evaluate(() => window.devicePixelRatio)).toBe(2);
          expect(
            await pages.owner.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches)
          ).toBe(true);
          await pages.owner.evaluate(() => localStorage.setItem('identity', 'owner'));
          expect(await pages.member.evaluate(() => localStorage.getItem('identity'))).toBeNull();
        },
        async run(director) {
          const owner = director.actor('owner');
          const member = director.actor('member');
          await director.scene(
            {
              id: 'shared-update',
              title: 'Plan together',
              subtitle: '',
              layout: 'split',
              actors: ['owner', 'member']
            },
            async () => {
              await director.hold(250);
              await owner.click(owner.page.getByRole('button', { name: 'Suggest Lisbon' }));
              await expectPage(member.page.locator('#message')).toHaveText('Lisbon together');
              await director.hold(500);
            }
          );
        }
      },
      { baseUrl: `http://127.0.0.1:${address.port}`, headed: false, publicDir }
    );
    expect(screenshotAttempts).toBeGreaterThan(2);
    expect(capture.actors).toHaveLength(2);
    expect(capture.shots).toHaveLength(1);
    for (const actor of capture.actors) {
      expect(actor.frames.length).toBeGreaterThan(1);
      expect(actor.frames[0].atMs).toBeLessThanOrEqual(capture.shots[0].startMs);
      for (const frame of actor.frames) {
        const bytes = await readFile(join(publicDir, frame.src));
        expect(() => assertPngSize(bytes, { width: 3840, height: 2160 })).not.toThrow();
      }
    }
    expect(capture.actors[0].cursor.some((event) => event.click)).toBe(true);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
}, 30_000);
