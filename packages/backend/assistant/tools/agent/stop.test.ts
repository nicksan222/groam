import { expect, test } from 'vite-plus/test';
import { endedInWait, stopAfterWait } from '#backend/assistant/tools/agent/stop';

type Steps = Parameters<typeof endedInWait>[0];

const step = (...outputs: unknown[]) => ({ toolResults: outputs.map((output) => ({ output })) });

test.each<[string, Steps, boolean]>([
  ['no steps', [], false],
  ['a step without tool results', [step()], false],
  ['a plain tool result', [step({ ok: true })], false],
  ['a null or primitive output', [step(null, 'wait', 1)], false],
  ['a truthy but non-boolean wait', [step({ wait: 'true' })], false],
  ['a missing output', [{ toolResults: [{}] }], false],
  ['a waitFor result', [step({ status: 'waiting', wait: true, waitId: 'w' })], true],
  ['a waitFor among other results', [step({ ok: true }, { wait: true })], true],
  ['a wait in an earlier step only', [step({ wait: true }), step({ ok: true })], false]
])('endedInWait with %s is %s', (_, steps, expected) => {
  expect(endedInWait(steps)).toBe(expected);
});

test('stopAfterWait ends the generation on the step that started a wait', () => {
  const stop = stopAfterWait as unknown as (options: { steps: Steps }) => boolean;
  expect(stop({ steps: [step({ ok: true })] })).toBe(false);
  expect(stop({ steps: [step({ ok: true }), step({ wait: true })] })).toBe(true);
});
