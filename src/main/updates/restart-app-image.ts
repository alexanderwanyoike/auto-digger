import { app, dialog } from 'electron';
import { spawn } from 'node:child_process';
import { dirname } from 'node:path';
import type { Result } from '../../shared/result';

function launch(file: string): Result<undefined, string> {
  const error = `The update was installed, but Auto Digger could not restart. Open ${file} to continue.`;
  try {
    const child = spawn(file, process.argv.slice(1), {
      cwd: dirname(file),
      detached: true,
      stdio: 'ignore',
    });
    child.once('error', () => {
      process.stderr.write(`${error}\n`);
    });
    if (child.pid === undefined) return { ok: false, error };
    child.unref();
    return { ok: true, value: undefined };
  } catch {
    return { ok: false, error };
  }
}

export function scheduleAppImageRestart(file: string) {
  // Electron's relaunch helper lives in the temporary image that is about to unmount.
  app.once('will-quit', () => {
    app.releaseSingleInstanceLock();
    const result = launch(file);
    if (!result.ok) dialog.showErrorBox('Auto Digger could not restart', result.error);
  });
}
