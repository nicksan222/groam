import { describe, expect, it } from 'vitest';
import { assertLocalUrl } from '#src/capture/session';
import { createEdit } from '#src/edit';
import { projectSchema } from '#src/model';
import { testCapture as capture, testVideo } from '#src/test-fixtures';

describe('showcase project validation', () => {
  it('accepts a captured two-person story', () => {
    expect(projectSchema.safeParse({ capture, edit: createEdit(capture, testVideo) }).success).toBe(
      true
    );
  });

  it.each(['captures/../../secret.jpg', '/tmp/frame.jpg', 'https://example.com/frame.jpg'])(
    'rejects unsafe asset %s',
    (src) => {
      const changed = structuredClone(capture);
      changed.actors[0].frames[0].src = src;
      expect(
        projectSchema.safeParse({ capture: changed, edit: createEdit(changed, testVideo) }).success
      ).toBe(false);
    }
  );

  it('rejects missing actors, duplicate scenes, invalid layouts and trims outside the capture', () => {
    for (const change of [
      (edit: ReturnType<typeof createEdit>) => {
        edit.scenes[0].style.actors = ['unknown', 'member'];
      },
      (edit: ReturnType<typeof createEdit>) => {
        edit.scenes.push(edit.scenes[0]);
      },
      (edit: ReturnType<typeof createEdit>) => {
        edit.scenes[0].style.actors = ['owner'];
      },
      (edit: ReturnType<typeof createEdit>) => {
        edit.scenes[0].endMs = 3000;
      },
      (edit: ReturnType<typeof createEdit>) => {
        edit.scenes[0].startMs = 2000;
      }
    ]) {
      const edit = structuredClone(createEdit(capture, testVideo));
      change(edit);
      expect(projectSchema.safeParse({ capture, edit }).success).toBe(false);
    }
  });

  it('rejects trims before a participant has a recorded frame', () => {
    const changed = structuredClone(capture);
    changed.actors[1].frames[0].atMs = 150;
    expect(
      projectSchema.safeParse({ capture: changed, edit: createEdit(changed, testVideo) }).success
    ).toBe(false);
  });

  it('rejects unordered captured frames', () => {
    const changed = structuredClone(capture);
    changed.actors[0].frames.push(
      { atMs: 200, src: 'captures/test/frame.jpg' },
      { atMs: 150, src: 'captures/test/older.jpg' }
    );
    expect(
      projectSchema.safeParse({ capture: changed, edit: createEdit(changed, testVideo) }).success
    ).toBe(false);
  });

  it.each(['http://localhost:5173', 'http://127.0.0.1:5173', 'http://[::1]:5173'])(
    'allows local demo origin %s',
    (url) => {
      expect(() => assertLocalUrl(url)).not.toThrow();
    }
  );

  it.each([
    'https://groam.app',
    'http://localhost.evil.test',
    'file:///tmp/index.html',
    'http://user:password@localhost'
  ])('refuses non-demo origin %s', (url) => {
    expect(() => assertLocalUrl(url)).toThrow();
  });
});
