import fs from 'node:fs';

/**
 * Whether a process a check started is still running (DRK-1780 R2): a pid that does not exist,
 * or one that has exited and waits in state `Z` for its parent to reap it, is not. Linux only —
 * it reads `/proc/<pid>/stat`.
 */
export function isRunning(pid: number): boolean {
  let stat: string;
  try {
    stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
  } catch {
    return false;
  }
  // `pid (comm) state …` — `comm` may itself hold `)`, so the state follows the last one.
  return stat[stat.lastIndexOf(')') + 2] !== 'Z';
}
