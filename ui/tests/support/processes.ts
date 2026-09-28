/**
 * Whether a process a check started is still running (DRK-1780 R2): a pid that does not exist,
 * or one that has exited and waits in state `Z` for its parent to reap it, is not. Linux only —
 * it reads `/proc/<pid>/stat`.
 */
export function isRunning(pid: number): boolean {
  throw new Error(`isRunning(${pid}) is not implemented yet (DRK-1780 §3 row 2)`);
}
