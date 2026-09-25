'use client';

import { useState } from 'react';
import type { JSX } from 'react';
import { DetailPanel } from '@/components/feedback/DetailPanel';
import { AccountNumber } from '@/components/ledger/AccountNumber';
import { LedgerTable } from '@/components/ledger/LedgerTable';
import type { LedgerColumn } from '@/components/ledger/LedgerTable';
import { Money } from '@/components/ledger/Money';
import { StatementTable } from '@/components/ledger/StatementTable';
import type { StatementRowShape } from '@/components/ledger/StatementTable';
import { StatusBadge } from '@/components/ledger/StatusBadge';
import { TableCard } from '@/components/ui/table-card';

interface Account {
  id: string;
  accountNumber: string;
  status: 'Active' | 'Dormant' | 'Frozen';
  balance: string;
}

const ACCOUNTS: Account[] = [
  { id: 'a1', accountNumber: 'ACME-000123', status: 'Active', balance: '12400.00' },
  { id: 'a2', accountNumber: 'ACME-000456', status: 'Dormant', balance: '0.00' },
  { id: 'a3', accountNumber: 'ACME-000789', status: 'Frozen', balance: '500.00' },
];

const ACCOUNT_COLUMNS: LedgerColumn<Account>[] = [
  { key: 'accountNumber', header: 'Account', render: (row) => <AccountNumber value={row.accountNumber} /> },
  { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  { key: 'balance', header: 'Balance', align: 'right', render: (row) => <Money amount={row.balance} currency="SGD" decimalPlaces={2} /> },
];

const STATEMENT_ROWS: StatementRowShape[] = [
  {
    id: 'p1',
    effectiveDate: '2026-09-01',
    recordedAt: '2026-09-01T09:00:00Z',
    postingNumber: 'PST-000001',
    description: 'Credit posting',
    signedAmount: '500.00',
    balanceAfter: '12900.00',
    streamPosition: 1,
    status: 'Posted',
  },
  {
    id: 'p2',
    effectiveDate: '2026-09-02',
    recordedAt: '2026-09-02T09:00:00Z',
    postingNumber: 'PST-000002',
    description: 'Debit posting',
    signedAmount: '-300.00',
    balanceAfter: '12600.00',
    streamPosition: 2,
    status: 'Posted',
  },
  {
    id: 'p3',
    effectiveDate: '2026-09-03',
    recordedAt: '2026-09-03T09:00:00Z',
    postingNumber: 'PST-000003',
    description: 'Original posting, later reversed',
    signedAmount: '1000.00',
    balanceAfter: '13600.00',
    streamPosition: 3,
    status: 'Reversed',
  },
  {
    id: 'p4',
    effectiveDate: '2026-09-04',
    recordedAt: '2026-09-04T09:00:00Z',
    postingNumber: 'PST-000004',
    description: 'Reversal of the original posting',
    signedAmount: '-1000.00',
    balanceAfter: '12600.00',
    streamPosition: 4,
    status: 'Posted',
  },
];

function AccountsGreyscaleSection(): JSX.Element {
  return (
    <section data-testid="accounts-greyscale-table">
      <LedgerTable columns={ACCOUNT_COLUMNS} rows={ACCOUNTS} rowKey="id" />
    </section>
  );
}

function PostingsGreyscaleSection(): JSX.Element {
  return (
    <section data-testid="postings-greyscale-table">
      <StatementTable rows={STATEMENT_ROWS} decimalPlaces={2} />
    </section>
  );
}

function PanelDemoSection(): JSX.Element {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = ACCOUNTS.find((a) => a.id === selectedId) ?? null;

  return (
    <section data-testid="panel-demo">
      {/* The restyled DetailPanel (DRK-1747 §3 row 12) is its own non-modal chrome, drawn by
          TableCard's panel slot over the frame's right edge — no longer inside AppShell's Sheet. */}
      <TableCard
        panel={
          selected ? (
            <DetailPanel title={selected.accountNumber} onClose={() => setSelectedId(null)}>
              <div data-testid="panel-balance">
                <Money amount={selected.balance} currency="SGD" decimalPlaces={2} />
              </div>
            </DetailPanel>
          ) : null
        }
      >
        <LedgerTable columns={ACCOUNT_COLUMNS} rows={ACCOUNTS} rowKey="id" selectedId={selectedId} onSelectRow={(row) => setSelectedId(row.id)} />
      </TableCard>
    </section>
  );
}

export function KitHarness(): JSX.Element {
  return (
    <div className="p-5">
      <AccountsGreyscaleSection />
      <PostingsGreyscaleSection />
      <PanelDemoSection />
    </div>
  );
}
