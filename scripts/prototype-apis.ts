import { spawn } from 'node:child_process';

const child = spawn(process.platform === 'win32' ? 'yarn.cmd' : 'yarn', ['dev'], {
  stdio: 'inherit',
  env: { ...process.env, AUTO_DIGGER_API_PROTOTYPE: '1' },
});
child.on('error', () => {
  process.stderr.write('Could not launch the API prototype. Run yarn install first.\n');
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
