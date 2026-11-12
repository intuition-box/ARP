import { expect, test } from 'bun:test';

import { chromePath, OG_HEIGHT, OG_WIDTH } from '../build/og-image.ts';

/** The share card's browser and size (task 145). */
test('the card is the size og:image cards are drawn at', () => {
  expect([OG_WIDTH, OG_HEIGHT]).toEqual([1200, 630]);
});

test('ARP_CHROME wins, then the cached Chromium under /root, then the one in the home', () => {
  const cached = 'ms-playwright/chromium-1140/chrome-linux/chrome';
  expect(chromePath({ ARP_CHROME: '/opt/chrome' }, '/home/u', () => false)).toBe('/opt/chrome');
  expect(chromePath({}, '/home/u', () => true)).toBe(`/root/.cache/${cached}`);
  expect(chromePath({ ARP_CHROME: '' }, '/home/u', (path) => path.startsWith('/home/u'))).toBe(`/home/u/.cache/${cached}`);
});

test('no browser stops with the way to get one', () => {
  expect(() => chromePath({}, '/home/u', () => false)).toThrow('set ARP_CHROME');
});
