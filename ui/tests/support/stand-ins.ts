/**
 * The stand-ins the suite starts (`playwright.config.ts` `webServer`) and how to tell one has
 * stopped (DRK-1726 R3). An open port is not enough: a process that was just killed can still
 * complete a connection while it goes down, and a stopped container's published port still
 * accepts one. So each stand-in must answer — an HTTP stand-in any response to a request that
 * changes nothing (the fake ledger never logs `/__requests`), the cache a `PONG`.
 */
import http from 'node:http';
import net from 'node:net';
import { DEFAULT_CONSOLE_BASE, FAKE_LEDGER_BASE, FAKE_OIDC_BASE, FAKE_REDIS_PORT } from './fixtures';

// A console's first `/healthz` is compiled on demand; every later answer takes milliseconds.
const PROBE_TIMEOUT_MS = 15_000;

interface StandIn {
  name: string;
  answers: () => Promise<boolean>;
}

/** A fresh connection every time (`agent: false`): a pooled one the stand-in has since closed
 * would read as a stand-in that stopped. */
function answersHttp(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const request = http.get(url, { agent: false, timeout: PROBE_TIMEOUT_MS }, (response) => {
      response.resume();
      resolve(true);
    });
    request.once('timeout', () => request.destroy());
    request.once('error', () => resolve(false));
  });
}

function answersPing(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    let answer = '';
    const socket = net.connect({ port, host: '127.0.0.1' });
    const settle = (alive: boolean): void => {
      socket.destroy();
      resolve(alive);
    };
    socket.setTimeout(PROBE_TIMEOUT_MS, () => settle(false));
    socket.once('error', () => settle(false));
    socket.once('close', () => settle(false));
    socket.once('connect', () => socket.write('PING\r\n'));
    socket.on('data', (chunk) => {
      answer += String(chunk);
      if (answer.includes('\r\n')) settle(answer === '+PONG\r\n');
    });
  });
}

export const STAND_INS: StandIn[] = [
  { name: 'sign-in server', answers: () => answersHttp(`${FAKE_OIDC_BASE}/`) },
  { name: 'ledger', answers: () => answersHttp(`${FAKE_LEDGER_BASE}/__requests`) },
  { name: 'cache', answers: () => answersPing(FAKE_REDIS_PORT) },
  { name: 'console', answers: () => answersHttp(`${DEFAULT_CONSOLE_BASE}/healthz`) },
];

/** The name of the first stand-in that no longer answers, if any. */
export async function stoppedStandIn(): Promise<string | undefined> {
  const alive = await Promise.all(STAND_INS.map((standIn) => standIn.answers()));
  return STAND_INS[alive.indexOf(false)]?.name;
}

export function standInStopped(name: string): string {
  return `stand-in ${name} stopped`;
}
