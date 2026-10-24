import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import png2icons from 'png2icons';
import type { Result } from '../src/shared/result';

async function generateIcons(): Promise<Result<undefined, string>> {
  try {
    const directory = resolve('resources/icons');
    const source = await readFile(resolve(directory, 'icon.svg'));
    const png = await sharp(source).resize(1024, 1024).png().toBuffer();
    const ico = png2icons.createICO(png, png2icons.BICUBIC, 0, true, true);
    const icns = png2icons.createICNS(png, png2icons.BICUBIC, 0);
    if (!ico || !icns) return { ok: false, error: 'Native icon conversion failed.' };
    const images = await Promise.all(
      [16, 24, 32, 48, 64, 128, 256, 512].map(async (size) => ({
        name: `icon-${size.toString()}.png`,
        buffer: await sharp(source).resize(size, size).png().toBuffer(),
      })),
    );
    images.push(
      { name: 'icon.png', buffer: png },
      { name: 'icon.ico', buffer: ico },
      { name: 'icon.icns', buffer: icns },
    );
    const checking = process.argv.includes('--check');
    const results = await Promise.all(
      images.map(async ({ name, buffer }) => {
        const file = resolve(directory, name);
        if (checking) return buffer.equals(await readFile(file));
        await writeFile(file, buffer);
        return true;
      }),
    );
    if (results.includes(false))
      return {
        ok: false,
        error: 'App icons are stale. Run yarn icons:generate and commit the outputs.',
      };
    return { ok: true, value: undefined };
  } catch {
    return {
      ok: false,
      error:
        'App icons could not be generated or checked. Run yarn icons:generate from the repository root.',
    };
  }
}

const result = await generateIcons();
if (!result.ok) {
  process.stderr.write(`${result.error}\n`);
  process.exitCode = 1;
}
