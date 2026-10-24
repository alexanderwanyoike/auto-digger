import { isAbsolute } from 'node:path';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { callResearchApp } from './appClient';
import { createResearchToolServer } from './tools';

const file = process.argv[3];
if (process.argv[2] !== '--connection' || !file || !isAbsolute(file) || process.argv.length !== 4) {
  process.stderr.write('Use the MCP configuration shown in Auto Digger Settings.\n');
  process.exitCode = 1;
} else {
  serveStdio(
    () => createResearchToolServer((input, signal) => callResearchApp(file, input, signal)),
    {
      onerror: () => {
        process.stderr.write('The Auto Digger MCP connection was interrupted.\n');
      },
    },
  );
}
