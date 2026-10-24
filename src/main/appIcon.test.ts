import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';

test('ships the same app icon in Linux PNG, multi-size Windows ICO and macOS ICNS formats', async () => {
  const png = await readFile(resolve('resources/icons/icon.png'));
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(png.readUInt32BE(16)).toBe(1024);
  expect(png.readUInt32BE(20)).toBe(1024);
  const ico = await readFile(resolve('resources/icons/icon.ico'));
  expect(ico.readUInt16LE(2)).toBe(1);
  const count = ico.readUInt16LE(4);
  expect(count).toBeGreaterThanOrEqual(6);
  const sizes = Array.from({ length: count }, (_, index) => ico[6 + index * 16] || 256);
  expect(sizes).toEqual(expect.arrayContaining([16, 32, 48, 256]));
  const icns = await readFile(resolve('resources/icons/icon.icns'));
  expect(icns.subarray(0, 4).toString()).toBe('icns');
  expect(icns.readUInt32BE(4)).toBe(icns.length);
  expect(icns.includes(Buffer.from('ic10'))).toBe(true);
});
