import { EventEmitter } from 'node:events';
import { spawn } from 'node:child_process';
import { expect, test, vi } from 'vitest';
import { terminateProcess } from './terminateProcess';

vi.mock('node:child_process', () => ({
  spawn: vi.fn(() => Object.assign(new EventEmitter(), { unref: vi.fn() })),
}));

test('terminates the Windows process tree and falls back if the system utility fails', () => {
  const child = { pid: 1234, kill: vi.fn().mockReturnValue(true) };
  terminateProcess(child, 'win32');
  expect(spawn).toHaveBeenCalledWith('taskkill.exe', ['/PID', '1234', '/T', '/F'], {
    shell: false,
    windowsHide: true,
    stdio: 'ignore',
  });
  expect(child.kill).not.toHaveBeenCalled();
  const killer = vi.mocked(spawn).mock.results[0]?.value;
  killer?.emit('error', new Error('taskkill failed'));
  expect(child.kill).toHaveBeenCalledWith('SIGKILL');
});
