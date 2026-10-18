import { describe, expect, test } from 'vite-plus/test';
import {
  PAN_THRESHOLD,
  exceedsPanThreshold,
  panScrollLeft,
  startsOnEmptySpace
} from './trip-board-pan';

describe('panScrollLeft', () => {
  test('moves the scroll position against the pointer', () => {
    expect(panScrollLeft(100, 300, 250)).toBe(150);
    expect(panScrollLeft(100, 300, 340)).toBe(60);
    expect(panScrollLeft(100, 300, 300)).toBe(100);
  });
});

describe('exceedsPanThreshold', () => {
  test('treats small wobbles in either direction as a click', () => {
    expect(exceedsPanThreshold(PAN_THRESHOLD - 1)).toBe(false);
    expect(exceedsPanThreshold(-(PAN_THRESHOLD - 1))).toBe(false);
    expect(exceedsPanThreshold(PAN_THRESHOLD)).toBe(true);
    expect(exceedsPanThreshold(-PAN_THRESHOLD)).toBe(true);
  });
});

describe('startsOnEmptySpace', () => {
  const press = (html: string) => {
    const host = document.createElement('div');
    host.innerHTML = html;
    return host.querySelector('[data-target]');
  };

  test.each([
    ['a lane header', '<section><h2 data-target>Ideas</h2></section>'],
    ['bare lane padding', '<section data-target></section>']
  ])('is true on %s', (_name, html) => {
    expect(startsOnEmptySpace(press(html))).toBe(true);
  });

  test.each([
    ['a link', '<a href="/"><span data-target>Go</span></a>'],
    ['a button', '<button><span data-target>Go</span></button>'],
    ['a plain card', '<article><p data-target>Plan</p></article>'],
    ['a liftable card', '<div data-card-id="x"><p data-target>Idea</p></div>']
  ])('is false on %s', (_name, html) => {
    expect(startsOnEmptySpace(press(html))).toBe(false);
  });

  test('is false without a target', () => {
    expect(startsOnEmptySpace(null)).toBe(false);
  });
});
