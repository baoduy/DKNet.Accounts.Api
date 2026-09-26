/**
 * DRK-1728 §3 row 4 — the one search every screen carries: in the top bar of every screen but
 * Overview, and as Overview's own page field (brief Q4: one search landmark per screen). The
 * caption states the route before anything is sent (`lib/search/classify.ts`); Enter sends it.
 * ⌘K on a Mac, Ctrl+K elsewhere, puts focus in it. Escape, or emptying the field, puts the
 * results away and leaves focus in the field (DRK-1734 N2).
 */
'use client';

import { useEffect, useId, useRef, useState, type JSX } from 'react';
import { RefusalAlert } from '@/components/feedback/RefusalAlert';
import { ScopeGate } from '@/components/feedback/ScopeGate';
import { AccountNumber } from '@/components/ledger/AccountNumber';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Caption } from '@/components/ui/text';
import { cn } from '@/components/ui/utils';
import { ledgerErrorTraceId, toLedgerError } from '@/lib/api/refusal';
import {
  accountNumberExists,
  lookupRecord,
  searchAccountsAndGroups,
  type AccountDto,
  type AccountGroupDto,
  type SearchMatches,
} from '@/lib/query/overview';
import { classifySearch, SEARCH_CAPTIONS } from '@/lib/search/classify';

export const SEARCH_LABEL = 'Search accounts, groups and postings';

export interface TopBarSearchProps {
  grantedScopes: string[];
  /** `page`: Overview's own full-width field, focused when the screen opens. */
  variant?: 'topbar' | 'page';
}

type Outcome =
  | { kind: 'pending' }
  | { kind: 'nothing'; postingsLookedUp: boolean }
  | { kind: 'noAccountNumber'; accountNumber: string; typed: string }
  | { kind: 'matches'; text: string; accounts: SearchMatches<AccountDto>; groups: SearchMatches<AccountGroupDto> }
  | { kind: 'error'; error: unknown };

function countLabel(count: number, noun: string): string {
  return `${count.toLocaleString('en-US')} ${count === 1 ? noun : `${noun}s`} matched`;
}

/** Leaves the screen for the record or list — a full load, so the destination reads its address
 * afresh (the list screens seed their state from the address once, on mount). */
function go(href: string): void {
  window.location.assign(href);
}

/** An account, then a group, then a posting — the first that exists opens. Postings are looked
 * up only with `postings.read`; `null` means nothing that was looked up carries the id. */
async function openByIdentifier(id: string, canReadPostings: boolean): Promise<string | null> {
  const account = await lookupRecord<AccountDto>(`/api/ledger/accounts/${id}`);
  if (account.state === 'forbidden') throw account.error;
  if (account.state === 'found') return `/accounts/${encodeURIComponent(account.record.accountNumber)}`;
  const group = await lookupRecord<AccountGroupDto>(`/api/ledger/account-groups/${id}`);
  if (group.state === 'forbidden') throw group.error;
  if (group.state === 'found') return `/groups?open=${id}`;
  if (!canReadPostings) return null;
  const posting = await lookupRecord(`/api/ledger/postings/${id}`);
  if (posting.state === 'forbidden') throw posting.error;
  return posting.state === 'found' ? `/records?open=${id}` : null;
}

export function TopBarSearch({ grantedScopes, variant = 'topbar' }: TopBarSearchProps): JSX.Element {
  const [typed, setTyped] = useState('');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Only the latest search may draw its outcome — an earlier, slower answer is dropped.
  const latestRef = useRef(0);
  const captionId = useId();
  const canReadPostings = grantedScopes.includes('postings.read');
  const classified = classifySearch(typed);

  useEffect(() => {
    if (variant === 'page') inputRef.current?.focus();
    function onKeyDown(event: KeyboardEvent): void {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [variant]);

  async function run(search: () => Promise<Outcome | null>): Promise<void> {
    const ticket = ++latestRef.current;
    setOutcome({ kind: 'pending' });
    let next: Outcome | null;
    try {
      next = await search();
    } catch (error) {
      next = { kind: 'error', error };
    }
    if (ticket === latestRef.current) setOutcome(next);
  }

  /** Puts the results away; an answer still on its way is dropped too. */
  function dismiss(): void {
    latestRef.current += 1;
    setOutcome(null);
  }

  function searchText(text: string): Promise<void> {
    return run(async () => ({ kind: 'matches', text, ...(await searchAccountsAndGroups(text)) }));
  }

  function submit(): void {
    const { route, value } = classified;
    if (route === 'tooShort') return;
    if (route === 'text') {
      void searchText(value);
      return;
    }
    if (route === 'accountNumber') {
      void run(async () => {
        if (!(await accountNumberExists(value))) return { kind: 'noAccountNumber', accountNumber: value, typed: typed.trim() };
        go(`/accounts?${new URLSearchParams({ accountNumber: value }).toString()}`);
        return null;
      });
      return;
    }
    void run(async () => {
      const href = await openByIdentifier(value, canReadPostings);
      if (href === null) return { kind: 'nothing', postingsLookedUp: canReadPostings };
      go(href);
      return null;
    });
  }

  return (
    <div role="search" className={cn('relative flex flex-col gap-1', variant === 'page' ? 'w-full' : 'w-72')}>
      <Input
        ref={inputRef}
        type="search"
        aria-label={SEARCH_LABEL}
        aria-describedby={captionId}
        placeholder={variant === 'page' ? 'Account id or number, group, posting id, or a name' : 'Search (⌘K)'}
        value={typed}
        onChange={(event) => {
          setTyped(event.target.value);
          if (event.target.value === '') dismiss();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            submit();
          }
          if (event.key === 'Escape') dismiss();
        }}
      />
      <Caption id={captionId}>
        {typed.trim().length > 0 ? SEARCH_CAPTIONS[classified.route] : null}
      </Caption>
      {outcome ? (
        <section
          aria-label="Search results"
          className={cn(
            'flex flex-col gap-3 rounded-md border border-border bg-card p-4',
            variant === 'topbar' && 'absolute top-full right-0 z-50 mt-1 w-[32rem] shadow-card',
          )}
        >
          <SearchOutcome outcome={outcome} onSearchText={searchText} />
        </section>
      ) : null}
    </div>
  );
}

function SearchOutcome({ outcome, onSearchText }: { outcome: Outcome; onSearchText: (text: string) => Promise<void> }): JSX.Element {
  switch (outcome.kind) {
    case 'pending':
      return <p>Searching…</p>;
    case 'error':
      return <RefusalAlert errors={[toLedgerError(outcome.error)]} traceId={ledgerErrorTraceId(outcome.error)} />;
    case 'nothing':
      return outcome.postingsLookedUp ? (
        <p>No account, group or posting carries this identifier.</p>
      ) : (
        <>
          <p>No account or group carries this identifier.</p>
          <p className="flex flex-wrap items-center gap-2">
            <span>Postings were not looked up.</span>
            <ScopeGate scope="postings.read" />
          </p>
        </>
      );
    case 'noAccountNumber':
      return (
        <>
          <p>{`No account carries the number ${outcome.accountNumber}.`}</p>
          <Button type="button" size="sm" className="self-start" onClick={() => void onSearchText(outcome.typed)}>
            {`Search accounts and groups for "${outcome.typed}"`}
          </Button>
        </>
      );
    case 'matches': {
      const query = new URLSearchParams({ search: outcome.text }).toString();
      return (
        <>
          <section aria-label="Matching accounts" className="flex flex-col gap-2">
            <p className="font-semibold">{countLabel(outcome.accounts.total, 'account')}</p>
            <ul className="flex flex-col gap-1">
              {outcome.accounts.items.map((account) => (
                <li key={account.id} className="flex items-center gap-2">
                  <AccountNumber value={account.accountNumber} href={`/accounts/${encodeURIComponent(account.accountNumber)}`} />
                  <span>{account.name}</span>
                </li>
              ))}
            </ul>
            <a className="text-primary underline" href={`/accounts?${query}`}>
              Show all on the Accounts screen
            </a>
          </section>
          <section aria-label="Matching groups" className="flex flex-col gap-2">
            <p className="font-semibold">{countLabel(outcome.groups.total, 'group')}</p>
            <ul className="flex flex-col gap-1">
              {outcome.groups.items.map((group) => (
                <li key={group.id} className="flex items-center gap-2">
                  <a className="font-mono text-primary underline" href={`/groups?open=${group.id}`}>
                    {group.code}
                  </a>
                  <span>{group.name}</span>
                </li>
              ))}
            </ul>
            <a className="text-primary underline" href={`/groups?${query}`}>
              Show all on the Account groups screen
            </a>
          </section>
        </>
      );
    }
  }
}
