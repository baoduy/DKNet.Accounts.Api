'use client';

import { Suspense, useMemo, useState, type JSX } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQueries } from '@tanstack/react-query';
import { DetailPanel } from '@/components/feedback/DetailPanel';
import { RefusalAlert, type LedgerError } from '@/components/feedback/RefusalAlert';
import { IdempotencyKeyField } from '@/components/forms/IdempotencyKeyField';
import { useIdempotencyKey } from '@/components/forms/use-idempotency-key';
import { FloorLine } from '@/components/ledger/FloorLine';
import { LedgerTable, type LedgerColumn } from '@/components/ledger/LedgerTable';
import { Money } from '@/components/ledger/Money';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { routeRefusal } from '@/lib/api/refusal';
import { accountBalanceKey } from '@/lib/query/keys';
import { useRecordPosting } from '@/lib/query/mutations';
import { parseListViewState, toListViewSearchParams, type ListViewState } from '@/lib/url-state';

/**
 * DRK-1684 §3 row 14 — a list + panel + posting form over the fake ledger service
 * (`tests/fakes/fake-ledger-service.ts`), so the `@integration` scenarios in DRK-1679 §5
 * have something to drive. Test-only fixture: not a real screen (§4), so it takes shortcuts
 * (a hardcoded account roster in place of a "list accounts" endpoint, which the contract has
 * none of) a real screen would not.
 */
const ROSTER_ACCOUNTS = ['ACME-000123'];
const CURRENCY_OPTIONS = ['SGD', 'JPY', 'BHD'];

interface AccountBalance {
  currency: string;
  balance: string;
  availableBalance: string;
  heldAmount: string;
  floor: string;
}

async function fetchAccountBalance(accountId: string): Promise<AccountBalance | null> {
  const response = await fetch(`/api/ledger/accounts/${accountId}/balance`);
  if (!response.ok) return null;
  return (await response.json()) as AccountBalance;
}

interface PostingFields {
  accountId: string;
  direction: 'Credit' | 'Debit';
  amount: string;
  currency: string;
  category: string;
  effectiveDate: string;
}

const BLANK_FIELDS: PostingFields = { accountId: '', direction: 'Credit', amount: '', currency: '', category: '', effectiveDate: '' };

export default function LedgerHarnessPage(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <LedgerHarnessContent />
    </Suspense>
  );
}

function LedgerHarnessContent(): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const state = useMemo(() => parseListViewState(searchParams), [searchParams]);

  const balanceQueries = useQueries({
    queries: ROSTER_ACCOUNTS.map((accountId) => ({
      queryKey: accountBalanceKey(accountId),
      queryFn: () => fetchAccountBalance(accountId),
    })),
  });

  const accounts = ROSTER_ACCOUNTS.map((accountId, index) => ({ accountId, data: balanceQueries[index]?.data })).filter(
    (account): account is { accountId: string; data: AccountBalance } => account.data != null,
  );

  const currencyFilter = state.filters.currency ?? '';
  const filtered = currencyFilter ? accounts.filter((account) => account.data.currency === currencyFilter) : accounts;
  const sorted = [...filtered].sort((a, b) => {
    if (state.sort?.field !== 'balance') return 0;
    const diff = Number(a.data.balance) - Number(b.data.balance);
    return state.sort.desc ? -diff : diff;
  });

  const selected = accounts.find((account) => account.accountId === state.openRecordId);

  function updateState(patch: Partial<ListViewState>): void {
    const next: ListViewState = { ...state, ...patch };
    router.replace(`${pathname}?${toListViewSearchParams(next).toString()}`, { scroll: false });
  }

  const { value: idempotencyKey, regenerate } = useIdempotencyKey();
  const { mutate } = useRecordPosting();
  const [formOpen, setFormOpen] = useState(false);
  const [fields, setFields] = useState<PostingFields>(BLANK_FIELDS);
  const [fieldErrors, setFieldErrors] = useState<Record<string, LedgerError>>({});
  const [alertErrors, setAlertErrors] = useState<LedgerError[]>([]);
  const [recorded, setRecorded] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const effectiveDateInvalid = fieldErrors.effectiveDate !== undefined || fields.effectiveDate === '' || fields.effectiveDate > today;

  function updateField<K extends keyof PostingFields>(key: K, value: PostingFields[K]): void {
    setFields((current) => ({ ...current, [key]: value }));
  }

  async function handleRecord(): Promise<void> {
    setRecorded(false);
    setFieldErrors({});
    setAlertErrors([]);
    const result = await mutate({
      accountId: fields.accountId,
      direction: fields.direction,
      amount: fields.amount,
      currency: fields.currency,
      category: fields.category,
      effectiveDate: fields.effectiveDate || undefined,
      idempotencyKey,
    });

    if (result.ok) {
      setRecorded(true);
      setFormOpen(false);
      setFields(BLANK_FIELDS);
      regenerate();
      return;
    }

    const routed = routeRefusal(result.errors ?? []);
    setFieldErrors(routed.fieldErrors);
    setAlertErrors(routed.alertErrors);
  }

  const columns: LedgerColumn<{ accountId: string; data: AccountBalance }>[] = [
    { key: 'accountId', header: 'Account' },
    { key: 'currency', header: 'Currency', render: (row) => row.data.currency },
    {
      key: 'balance',
      header: 'Balance',
      sortable: true,
      align: 'right',
      render: (row) => <Money amount={row.data.balance} currency={row.data.currency} showCurrency />,
    },
  ];

  return (
    <div className="flex gap-6 p-6">
      <div className="flex flex-1 flex-col gap-4">
        {formOpen ? null : (
          // Hidden while the posting form is open: its own "Currency" field's accessible name
          // is a substring of this control's, and Playwright's getByLabel matches on either.
          <label className="flex flex-col gap-1">
            Currency filter
            <select
              aria-label="Currency filter"
              value={currencyFilter}
              onChange={(event) => updateState({ filters: { ...state.filters, currency: event.target.value } })}
            >
              <option value="">All</option>
              {CURRENCY_OPTIONS.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </label>
        )}

        <LedgerTable
          columns={columns}
          rows={sorted}
          rowKey={(row) => row.accountId}
          selectedId={state.openRecordId ?? null}
          onSelectRow={(row) => updateState({ openRecordId: row.accountId })}
          orderBy={state.sort?.field}
          desc={state.sort?.desc}
          onSort={(field) => updateState({ sort: { field, desc: state.sort?.field === field && !state.sort.desc } })}
        />

        <div className="flex items-end gap-4">
          <div data-testid="idempotency-key">
            <IdempotencyKeyField value={idempotencyKey} onRegenerate={regenerate} />
          </div>
          <label className="flex flex-col gap-1">
            Effective date
            <input
              type="date"
              aria-label="Effective date"
              aria-invalid={effectiveDateInvalid ? 'true' : undefined}
              value={fields.effectiveDate}
              onChange={(event) => updateField('effectiveDate', event.target.value)}
            />
          </label>
          {formOpen ? null : (
            // Hidden once open: its own name is a substring of the "Record" submit button's.
            <Button type="button" onClick={() => setFormOpen(true)}>
              Record posting
            </Button>
          )}
        </div>

        {formOpen ? (
          <div className="flex flex-col gap-2">
            <label className="flex flex-col gap-1">
              Account
              <Input aria-label="Account" value={fields.accountId} onChange={(event) => updateField('accountId', event.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              Direction
              <select
                aria-label="Direction"
                value={fields.direction}
                onChange={(event) => updateField('direction', event.target.value as PostingFields['direction'])}
              >
                <option value="Credit">Credit</option>
                <option value="Debit">Debit</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              Amount
              <Input aria-label="Amount" value={fields.amount} onChange={(event) => updateField('amount', event.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              Currency
              <Input aria-label="Currency" value={fields.currency} onChange={(event) => updateField('currency', event.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              Category
              <Input aria-label="Category" value={fields.category} onChange={(event) => updateField('category', event.target.value)} />
            </label>
            <Button type="button" onClick={handleRecord}>
              Record
            </Button>
          </div>
        ) : null}

        {recorded ? <p>Posting recorded.</p> : null}
        {alertErrors.length ? <RefusalAlert errors={alertErrors} /> : null}
      </div>

      {selected ? (
        <div data-testid="detail-panel" className="w-80">
          <DetailPanel title={selected.accountId} onClose={() => updateState({ openRecordId: undefined })}>
            <Money amount={selected.data.balance} currency={selected.data.currency} showCurrency />
            <FloorLine
              account={{ permittedToGoNegative: false, overdraftLimit: null, minimumBalance: null, currency: selected.data.currency }}
              floor={selected.data.floor}
            />
          </DetailPanel>
        </div>
      ) : null}
    </div>
  );
}
