/**
 * DRK-1745 §3 rows 4, 8, 9 — the accounts screen's one side panel: view, open and edit in the
 * same `DetailPanel` (Design/ui_kits/accounts-crud/Accounts.jsx). It reads and writes through
 * the same hooks the screen and the detail page already use — no new route, no new payload.
 */
'use client';

import { useState, type JSX } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { DetailList, DetailPanel, DetailSection } from '@/components/feedback/DetailPanel';
import { FailedRead, type LedgerError } from '@/components/feedback/RefusalAlert';
import { ScopeGate } from '@/components/feedback/ScopeGate';
import { usePanelFocus } from '@/components/feedback/use-panel-focus';
import { MetadataEditor } from '@/components/forms/MetadataEditor';
import { BalanceTiles } from '@/components/ledger/BalanceTiles';
import { Currency as CurrencyCode } from '@/components/ledger/Currency';
import { FloorLine } from '@/components/ledger/FloorLine';
import { Money } from '@/components/ledger/Money';
import { StatusBadge } from '@/components/ledger/StatusBadge';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Dialog } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Caption, Mono, Note } from '@/components/ui/text';
import { formatOpenedOn } from '@/lib/accounts/filters';
import { useChangeAccountDetails, useOpenAccount, useSetAccountControls } from '@/lib/accounts/mutations';
import { useAccount, useAccountBalance, type AccountDto, type AccountGroupDto, type AccountLookup } from '@/lib/accounts/query';
import type { Currency } from '@/lib/query/currencies';
import { AccountForm, type AccountFormValues } from './AccountForm';
import { AccountStatusControl } from './AccountStatusControl';

export type AccountPanelMode = 'view' | 'open' | 'edit';

export interface AccountPanelProps {
  mode: AccountPanelMode;
  /** The account's guid — view and edit only. */
  accountId?: string;
  grantedScopes: string[];
  groups: AccountGroupDto[];
  currencies: Currency[];
  onClose: () => void;
  onEdit: () => void;
  onOpened: (account: AccountDto) => void;
  onSaved: (account: AccountDto) => void;
  onStatusChange: (account: AccountDto, status: string) => void;
  onDirtyChange: (dirty: boolean) => void;
}

const FORM_ID = 'account-panel-form';

const BLANK_ACCOUNT = {
  accountNumber: '',
  groupName: '',
  name: '',
  currency: '',
  classification: 'Asset',
  externalReference: '',
  notes: '',
  overdraftLimit: null,
  minimumBalance: null,
  permittedToGoNegative: false,
};

const notSet = <Caption>Not set.</Caption>;

/** Open mode reads no account; view and edit read it by id (the cached copy the list primed). */
export function AccountPanel(props: AccountPanelProps): JSX.Element {
  return props.mode === 'open' ? <PanelBody {...props} /> : <ExistingAccountPanel {...props} />;
}

function ExistingAccountPanel(props: AccountPanelProps): JSX.Element {
  const accountQuery = useAccount(props.accountId ?? '');
  return <PanelBody {...props} accountQuery={accountQuery} />;
}

function PanelBody({
  mode,
  accountId = '',
  accountQuery,
  grantedScopes,
  groups,
  currencies,
  onClose,
  onEdit,
  onOpened,
  onSaved,
  onStatusChange,
  onDirtyChange,
}: AccountPanelProps & { accountQuery?: UseQueryResult<AccountLookup> }): JSX.Element {
  const [errors, setErrors] = useState<LedgerError[]>([]);
  const [pending, setPending] = useState(false);
  const focusRef = usePanelFocus<HTMLDivElement>(true);
  const balanceQuery = useAccountBalance(mode === 'view' ? accountId : '');
  const openAccount = useOpenAccount();
  const changeDetails = useChangeAccountDetails();
  const setControls = useSetAccountControls();

  const canWrite = grantedScopes.includes('accounts.write');
  const account = accountQuery?.data?.account;
  const decimalPlaces = account ? currencies.find((currency) => currency.code === account.currency)?.decimalPlaces : undefined;
  const groupCode = account ? (groups.find((group) => group.id === account.groupId)?.code ?? '') : '';
  const notes = account?.metadata?.notes ?? '';

  async function submit(values: AccountFormValues): Promise<void> {
    setPending(true);
    try {
      if (mode === 'open') {
        const result = await openAccount.mutate({
          groupId: values.groupId!,
          name: values.name,
          currency: values.currency!,
          classification: values.classification!,
          permittedToGoNegative: values.floor.permittedToGoNegative,
          overdraftLimit: values.floor.overdraftLimit,
          minimumBalance: values.floor.minimumBalance,
          metadata: values.notes ? { notes: values.notes } : undefined,
        });
        setErrors(result.ok ? [] : (result.errors ?? []));
        if (result.ok && result.account) onOpened(result.account);
        return;
      }
      if (!account) return;
      // As the detail page's edit (`AccountDetail.tsx` `AccountEditPanel`): `PUT` only when the
      // name or notes changed, `PATCH` for the floor settings; notes ride in `metadata.notes`.
      const found: LedgerError[] = [];
      const nameChanged = values.name !== account.name;
      const notesChanged = values.notes !== notes;
      if (nameChanged || notesChanged) {
        const result = await changeDetails.mutate({
          accountId: account.id,
          name: nameChanged ? values.name : undefined,
          metadata: notesChanged ? { ...account.metadata, notes: values.notes } : undefined,
        });
        if (!result.ok) found.push(...(result.errors ?? []));
      }
      const controls = await setControls.mutate({
        accountId: account.id,
        overdraftLimit: values.floor.overdraftLimit,
        minimumBalance: values.floor.minimumBalance,
        permittedToGoNegative: values.floor.permittedToGoNegative,
      });
      if (!controls.ok) found.push(...(controls.errors ?? []));
      setErrors(found);
      if (found.length === 0) onSaved(account);
    } finally {
      setPending(false);
    }
  }

  const title =
    mode === 'open' ? (
      'Open account'
    ) : mode === 'edit' ? (
      `Edit ${account?.accountNumber ?? ''}`
    ) : account ? (
      <span className="flex min-w-0 flex-col gap-1.5">
        <Mono>{account.accountNumber}</Mono>
        <span className="text-[length:var(--text-table-size)] font-normal text-muted-foreground">{account.name}</span>
        <span className="inline-flex items-center gap-2">
          <Chip>{account.classification}</Chip>
          <StatusBadge status={account.status} />
        </span>
      </span>
    ) : (
      'Account'
    );

  const actions =
    mode === 'view' ? (
      account ? (
        <>
          <AccountStatusControl
            variant="panel"
            accountId={account.id}
            accountNumber={account.accountNumber}
            status={account.status}
            balance={account.balance}
            heldAmount={account.heldAmount}
            currency={account.currency}
            decimalPlaces={decimalPlaces}
            granted={canWrite}
            onStatusChange={(status) => onStatusChange(account, status)}
          />
          <ScopeGate scope="accounts.write" granted={canWrite}>
            <Button type="button" size="sm" variant="primary" onClick={onEdit}>
              Edit account
            </Button>
          </ScopeGate>
        </>
      ) : null
    ) : (
      <>
        <Button type="button" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <ScopeGate scope="accounts.write" granted={canWrite}>
          <Button type="submit" form={FORM_ID} size="sm" variant="primary" disabled={pending}>
            {mode === 'open' ? 'Open account' : 'Save changes'}
          </Button>
        </ScopeGate>
      </>
    );

  const footnote =
    mode === 'open'
      ? 'The account number is assigned by the service on open. Group, currency, classification and external reference cannot be changed afterwards.'
      : mode === 'edit'
        ? 'Group, account number, currency, classification and external reference are fixed once the account is open. Name, notes and the floor policy can be corrected.'
        : null;

  function body(): JSX.Element | null {
    if (accountQuery) {
      if (accountQuery.isError) return <FailedRead error={accountQuery.error} onRetry={() => void accountQuery.refetch()} />;
      if (accountQuery.isPending) return <Skeleton className="h-40 w-full" />;
      if (!account) return <p>Account not found.</p>;
    }

    if (mode === 'view' && account) {
      const metadata = Object.entries(account.metadata ?? {}).map(([key, value]) => ({ key, value }));
      const amount = (value: string | undefined): JSX.Element =>
        value === undefined || value === null ? notSet : decimalPlaces === undefined ? <>{value}</> : <Money amount={value} decimalPlaces={decimalPlaces} align="left" />;
      return (
        <>
          <DetailSection divider={false} style={{ marginTop: 0 }}>
            Balances
          </DetailSection>
          {decimalPlaces === undefined ? null : (
            <BalanceTiles
              layout="inline"
              account={{ balance: account.balance, availableBalance: account.availableBalance, heldAmount: account.heldAmount, currency: account.currency, decimalPlaces }}
            />
          )}
          <Note className="mt-3">Balance, available and held are three values and are never combined into one.</Note>

          <DetailSection>Identity</DetailSection>
          <DetailList
            items={[
              { label: 'Account no.', value: <Mono>{account.accountNumber}</Mono> },
              { label: 'Name', value: account.name },
              { label: 'Group', value: groupCode ? <Mono>{groupCode}</Mono> : notSet },
              {
                label: 'Currency',
                value: (
                  <span>
                    <CurrencyCode code={account.currency} /> {decimalPlaces === undefined ? null : <Caption>{decimalPlaces} dp</Caption>}
                  </span>
                ),
              },
              { label: 'Classification', value: account.classification },
            ]}
          />

          <DetailSection>Floor policy</DetailSection>
          <DetailList
            items={[
              { label: 'May go negative', value: account.permittedToGoNegative ? 'Yes' : 'No' },
              { label: 'Overdraft limit', value: amount(account.overdraftLimit) },
              { label: 'Minimum balance', value: amount(account.minimumBalance) },
            ]}
          />
          {decimalPlaces === undefined ? null : (
            <FloorLine
              style={{ marginTop: 'var(--space-3)' }}
              account={{
                permittedToGoNegative: account.permittedToGoNegative,
                overdraftLimit: account.overdraftLimit ?? null,
                minimumBalance: account.minimumBalance ?? null,
                currency: account.currency,
                decimalPlaces,
              }}
              decimalPlaces={decimalPlaces}
              floor={balanceQuery.data?.floor}
            />
          )}

          {metadata.length ? (
            <>
              <DetailSection>Metadata</DetailSection>
              <MetadataEditor readOnly entries={metadata} />
            </>
          ) : null}

          <DetailSection>Audit</DetailSection>
          <DetailList
            items={[
              { label: 'External ref.', value: account.externalReference ? <Mono>{account.externalReference}</Mono> : notSet },
              { label: 'Opened', value: formatOpenedOn(account.openedOn) },
            ]}
          />
        </>
      );
    }

    return (
      <AccountForm
        mode={mode === 'open' ? 'open' : 'edit'}
        formId={FORM_ID}
        showStatus={false}
        account={
          account
            ? {
                accountNumber: account.accountNumber,
                groupName: groupCode,
                name: account.name,
                currency: account.currency,
                classification: account.classification,
                externalReference: account.externalReference ?? '',
                notes,
                overdraftLimit: account.overdraftLimit ?? null,
                minimumBalance: account.minimumBalance ?? null,
                permittedToGoNegative: account.permittedToGoNegative,
                status: account.status,
              }
            : BLANK_ACCOUNT
        }
        groups={groups.map((group) => ({ value: group.id, label: group.code }))}
        currencies={currencies.map((currency) => ({ value: currency.code, label: `${currency.code} — ${currency.decimalPlaces} dp`, decimalPlaces: currency.decimalPlaces }))}
        errors={errors}
        writeGranted={canWrite}
        onDirtyChange={onDirtyChange}
        onSubmit={(values) => void submit(values)}
      />
    );
  }

  return (
    <DetailPanel title={title} onClose={onClose} actions={actions} footnote={footnote}>
      <div ref={focusRef} tabIndex={-1} className="outline-none">
        {body()}
      </div>
    </DetailPanel>
  );
}

export interface DiscardChangesDialogProps {
  onKeepEditing: () => void;
  onDiscard: () => void;
}

/** The kit's "Discard unsaved changes?" — only ever mounted while an edited form would be dropped. */
export function DiscardChangesDialog({ onKeepEditing, onDiscard }: DiscardChangesDialogProps): JSX.Element {
  return (
    <Dialog
      title="Discard unsaved changes?"
      onClose={onKeepEditing}
      footer={
        <>
          <Button type="button" onClick={onKeepEditing}>
            Keep editing
          </Button>
          <Button type="button" variant="destructive" onClick={onDiscard}>
            Discard changes
          </Button>
        </>
      }
    >
      This form has edits that have not been sent. Closing the panel drops them.
    </Dialog>
  );
}
