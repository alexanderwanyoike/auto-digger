import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import type { AudioResult } from '../../shared/audio';
import { audioFailure } from '../../shared/audioFailure';

function terminate(child: ChildProcess) {
  try {
    if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, 'SIGKILL');
    else child.kill('SIGKILL');
  } catch {
    /* The process may already have exited. */
  }
}

function commandFailure(stderr: string): AudioResult<string> {
  if (/ffmpeg|ffprobe|unrecognized arguments|no such option/i.test(stderr))
    return audioFailure(
      'tools',
      'Audio downloads need current yt-dlp, FFmpeg and FFprobe installed. Update these tools, then try again.',
    );
  if (
    /private|removed|unavailable|not available|age.?restrict|sign in|copyright|members.only/i.test(
      stderr,
    )
  )
    return audioFailure(
      'unavailable',
      'This video is private, restricted or no longer available. Try another source for this record.',
    );
  return audioFailure(
    'network',
    'YouTube could not deliver this audio. Check your connection and try again. If it keeps happening, update yt-dlp.',
  );
}

export function createCommandRunner(executable = 'yt-dlp') {
  const active = new Set<ChildProcess>();
  return {
    cancelAll() {
      active.forEach(terminate);
    },
    execute(args: string[], timeout: number): Promise<AudioResult<string>> {
      return new Promise((resolve) => {
        const child = spawn(executable, args, {
          shell: false,
          windowsHide: true,
          detached: process.platform !== 'win32',
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        active.add(child);
        let stdout = '';
        let stderr = '';
        let expired = false;
        const timer = setTimeout(() => {
          expired = true;
          terminate(child);
        }, timeout);
        child.stdout.on('data', (data: Buffer) => {
          if (stdout.length + data.length > 4_000_000) {
            expired = true;
            terminate(child);
          } else stdout += data.toString();
        });
        child.stderr.on('data', (data: Buffer) => {
          stderr = (stderr + data.toString()).slice(-16000);
        });
        child.once('error', () => {
          clearTimeout(timer);
          active.delete(child);
          resolve(
            audioFailure(
              'tools',
              'Audio downloads need yt-dlp installed and available on your system. Install it alongside FFmpeg, then try again.',
            ),
          );
        });
        child.once('close', (code) => {
          clearTimeout(timer);
          active.delete(child);
          if (expired)
            resolve(
              audioFailure(
                'network',
                'This download took too long. Check your connection and try again.',
              ),
            );
          else if (code === 0) resolve({ ok: true, value: stdout });
          else resolve(commandFailure(stderr));
        });
      });
    },
  };
}
