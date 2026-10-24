import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';

export function terminateProcess(
  child: Pick<ChildProcess, 'pid' | 'kill'>,
  platform = process.platform,
) {
  try {
    if (platform === 'win32' && child.pid) {
      const killer = spawn('taskkill.exe', ['/PID', child.pid.toString(), '/T', '/F'], {
        shell: false,
        windowsHide: true,
        stdio: 'ignore',
      });
      killer.once('error', () => {
        child.kill('SIGKILL');
      });
      killer.once('close', (code) => {
        if (code !== 0) child.kill('SIGKILL');
      });
      killer.unref();
    } else if (child.pid) process.kill(-child.pid, 'SIGKILL');
    else child.kill('SIGKILL');
  } catch {
    /* The process may already have exited. */
  }
}
