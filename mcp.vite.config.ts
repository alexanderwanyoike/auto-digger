import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    {
      name: 'extension-licences',
      async closeBundle() {
        const packages = ['@modelcontextprotocol/server', '@modelcontextprotocol/core', 'zod'];
        const licences = await Promise.all(
          packages.map(
            async (name) =>
              `${name}\n\n${await readFile(resolve('node_modules', name, 'LICENSE'), 'utf8')}`,
          ),
        );
        await writeFile(resolve('out/extension/LICENSES.txt'), licences.join('\n\n'));
      },
    },
  ],
  ssr: { noExternal: true },
  build: {
    ssr: true,
    target: 'node20',
    outDir: 'out/extension',
    lib: { entry: resolve('src/mcp/index.ts'), formats: ['cjs'], fileName: () => 'mcp.cjs' },
    rolldownOptions: { external: [/^node:/], output: { entryFileNames: 'mcp.cjs' } },
  },
});
