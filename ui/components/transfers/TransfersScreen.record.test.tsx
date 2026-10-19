/**
 * DRK-2325 §5 — the @unit scenarios of Record transfer, driven through `TransfersScreen` with the
 * pass-through (`fetch`) stubbed (`transfers.fixture.ts`), the way
 * `components/records/RecordsScreen.record.test.tsx` drives Record posting:
 *
 *   Scenario: Record transfer is disabled without postings.write
 *   Scenario: The panel starts from the screen's account
 *   Scenario: The destination select leaves out the source
 *   Scenario: The fee account select offers source-currency accounts other than the source
 *   Scenario Outline: The rate and fee account fields show only when needed
 *   Scenario: The panel's defaults and locked currencies
 *   Scenario Outline: A chosen account that is not active says so
 *   Scenario: The idempotency key is made when the panel opens
 *   Scenario: Closing a panel with unsent entries asks first
 *   Scenario Outline: Review transfer waits for the fields this transfer needs
 *   Scenario Outline: The confirm step shows the exact estimated destination amount
 *   Scenario Outline: No estimate when a value is not a number
 *   Scenario: Only the confirm step sends the transfer
 *   Scenario Outline: A refusal marks the field at fault
 *   Scenario Outline: A refusal with no field shows in the alert box
 *   Scenario Outline: A retry after a refusal or no answer reuses the same key
 *   Scenario: No answer from the ledger is stated in the panel
 *   Scenario: A recorded transfer closes the panel and is acknowledged
 *   Scenario: A retry answered with the already recorded transfer counts as recorded
 *
 * Controls are found by the names the spec gives them: the header's "Record transfer", the
 * panel's "Source account", "Destination account", "Amount", "Rate", "Fee", "Fee account",
 * "Source currency" and "Destination currency" (shown, never editable), "Review transfer", and
 * the confirm step's own "Record transfer". A field is marked the way every console form marks
 * one: its control is `aria-invalid="true"` and the refusal's code is shown in the panel.
 *
 * Where the spec fixes only part of a text, the test pins that part inside its own element: the
 * discard question starts "Discard unsent", the estimate's absence says it "cannot be worked
 * out", and the "Transfer recorded" note carries the amount sent and the converted amount. The
 * no-answer text is the console's one wording for it (`NO_ANSWER_ERROR`), pinned whole.
 *
 * RED today: `TransfersScreen` is a stub that throws (brief §3 row 6).
 */
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ALL_SCOPES,
  answer,
  chooseAccount,
  confirmDialog,
  ID,
  inPanel,
  ledgerAccounts,
  mintKeysInOrder,
  OPTION,
  paged,
  panel,
  refused,
  renderScreen,
  resetScreen,
  setNow,
  settle,
  stubLedger,
  transferRow,
  type Answer,
  type LedgerStubOptions,
} from './transfers.fixture';

vi.mock('next/navigation', async () => {
  const fixture = await import('./transfers.address');
  return { useSearchParams: () => new URLSearchParams(fixture.address.search), useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => '/transfers' };
});

const NO_ANSWER_TEXT = 'The ledger service did not answer. Confirm again to retry; the same idempotency key is sent.';

interface Entries {
  source?: string;
  destination?: string;
  amount?: string;
  rate?: string;
  /** Replaces the fee's default; `''` empties it. */
  fee?: string;
  feeAccount?: string;
}

/** 100.00 SGD from "Alice SGD" to "Bob USD" at 0.74 with a 2.00 SGD fee to "Fees SGD". */
const FULL: Entries = { destination: OPTION.bobUsd, amount: '100.00', rate: '0.74', fee: '2.00', feeAccount: OPTION.feesSgd };

function control(name: string): HTMLInputElement & HTMLSelectElement {
  return inPanel().getByLabelText(name, { exact: true }) as HTMLInputElement & HTMLSelectElement;
}

function chosen(name: string): string | undefined {
  return control(name).selectedOptions[0]?.textContent ?? undefined;
}

/** The real choices a select offers — its empty "choose one" prompt left out. */
function choices(name: string): string[] {
  return [...control(name).options].filter((option) => option.value !== '').map((option) => option.textContent ?? '');
}

/** Mai chose `account` on the screen and opened Record transfer. */
async function openRecordTransfer(account = OPTION.alice): Promise<void> {
  await chooseAccount(account);
  const button = screen.getByRole('button', { name: 'Record transfer' });
  await waitFor(() => expect(button).toBeEnabled());
  await userEvent.click(button);
  await screen.findByRole('complementary', { name: 'Details' });
}

async function fill(entries: Entries): Promise<void> {
  if (entries.source) await userEvent.selectOptions(control('Source account'), entries.source);
  if (entries.destination) await userEvent.selectOptions(control('Destination account'), entries.destination);
  if (entries.amount !== undefined) await userEvent.type(control('Amount'), entries.amount);
  if (entries.rate !== undefined) await userEvent.type(control('Rate'), entries.rate);
  if (entries.fee !== undefined) {
    await userEvent.clear(control('Fee'));
    if (entries.fee) await userEvent.type(control('Fee'), entries.fee);
  }
  if (entries.feeAccount) await userEvent.selectOptions(control('Fee account'), entries.feeAccount);
}

async function review(): Promise<HTMLElement> {
  await userEvent.click(inPanel().getByRole('button', { name: 'Review transfer' }));
  return screen.findByRole('dialog');
}

async function confirm(): Promise<void> {
  await userEvent.click(within(confirmDialog()).getByRole('button', { name: 'Record transfer' }));
}

/** Each send of `POST /transfers` answered in turn. */
function inTurn(...answers: Array<() => Promise<Answer>>): () => Promise<Answer> {
  let sent = 0;
  return () => answers[Math.min(sent++, answers.length - 1)]();
}

function setUp(options: LedgerStubOptions = {}): ReturnType<typeof stubLedger> {
  mintKeysInOrder();
  return stubLedger({ transfers: () => answer(paged([])), ...options });
}

/** The panel still holds every entry of {@link FULL}. */
function expectFullEntriesKept(): void {
  expect(chosen('Source account')).toBe(OPTION.alice);
  expect(chosen('Destination account')).toBe(OPTION.bobUsd);
  expect(control('Amount')).toHaveValue('100.00');
  expect(control('Rate')).toHaveValue('0.74');
  expect(control('Fee')).toHaveValue('2.00');
  expect(chosen('Fee account')).toBe(OPTION.feesSgd);
}

const PANEL_CONTROLS = ['Source account', 'Destination account', 'Amount', 'Rate', 'Fee', 'Fee account'];

beforeEach(() => setNow());
afterEach(() => resetScreen());

describe('Record transfer is disabled without postings.write', () => {
  it('holding accounts.read and postings.read only: disabled, with "requires postings.write" beside it', async () => {
    setUp();
    renderScreen(['accounts.read', 'postings.read']);
    await chooseAccount(OPTION.alice);

    expect(screen.getByRole('button', { name: 'Record transfer' })).toBeDisabled();
    expect(screen.getByText('requires postings.write')).toBeInTheDocument();
  });

  it('the presence half: holding postings.write, Record transfer is enabled and nothing says it is required', async () => {
    setUp();
    renderScreen(ALL_SCOPES);
    await chooseAccount(OPTION.alice);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Record transfer' })).toBeEnabled());
    expect(screen.queryByText('requires postings.write')).toBeNull();
  });
});

describe("The panel starts from the screen's account", () => {
  it('starts the source at "Alice SGD", and Mai can change it to "Bob SGD"', async () => {
    setUp();
    renderScreen();
    await openRecordTransfer();

    expect(chosen('Source account')).toBe(OPTION.alice);
    await userEvent.selectOptions(control('Source account'), OPTION.bobSgd);
    expect(chosen('Source account')).toBe(OPTION.bobSgd);
  });
});

describe('The destination select leaves out the source', () => {
  it('offers "Bob SGD", "Fees SGD", "Dora SGD", "Bob USD" and "Kei JPY", and not "Alice SGD"', async () => {
    setUp();
    renderScreen();
    await openRecordTransfer();

    expect(choices('Destination account')).toEqual([OPTION.bobSgd, OPTION.feesSgd, OPTION.doraSgd, OPTION.bobUsd, OPTION.keiJpy]);
  });
});

describe('The fee account select offers source-currency accounts other than the source', () => {
  it('from "Alice SGD" to "Bob SGD" with a fee of 2.00: offers "Bob SGD", "Fees SGD" and "Dora SGD" only', async () => {
    setUp();
    renderScreen();
    await openRecordTransfer();

    await fill({ destination: OPTION.bobSgd, fee: '2.00' });

    expect(choices('Fee account')).toEqual([OPTION.bobSgd, OPTION.feesSgd, OPTION.doraSgd]);
  });
});

describe('The rate and fee account fields show only when needed', () => {
  it.each([
    { destination: OPTION.bobSgd, fee: '0', rate: false, feeAccount: false },
    { destination: OPTION.bobUsd, fee: '0', rate: true, feeAccount: false },
    { destination: OPTION.bobSgd, fee: '2.00', rate: false, feeAccount: true },
  ])('to $destination with a fee of $fee: rate shown $rate, fee account shown $feeAccount', async ({ destination, fee, rate, feeAccount }) => {
    setUp();
    renderScreen();
    await openRecordTransfer();

    await fill({ destination, fee });

    expect(inPanel().queryByLabelText('Rate', { exact: true }) !== null).toBe(rate);
    expect(inPanel().queryByLabelText('Fee account', { exact: true }) !== null).toBe(feeAccount);
  });
});

describe("The panel's defaults and locked currencies", () => {
  /** A currency shown, not chosen: named for the panel, holding the code, with no control in it. */
  function lockedCurrency(name: string): HTMLElement {
    const shown = inPanel().getByLabelText(name, { exact: true });
    expect(['INPUT', 'SELECT', 'TEXTAREA']).not.toContain(shown.tagName);
    expect(shown.querySelector('input, select, textarea')).toBeNull();
    return shown;
  }

  it('from "Alice SGD" to "Bob USD": the fee is 0, SGD and USD are shown locked, and the amount says "Total leaving the source, fee included."', async () => {
    setUp();
    renderScreen();
    await openRecordTransfer();

    await fill({ destination: OPTION.bobUsd });

    expect(control('Fee')).toHaveValue('0');
    expect(lockedCurrency('Source currency')).toHaveTextContent('SGD');
    expect(lockedCurrency('Destination currency')).toHaveTextContent('USD');
    expect(inPanel().getByText('Total leaving the source, fee included.')).toBeInTheDocument();
  });
});

describe('A chosen account that is not active says so', () => {
  it.each([
    { status: 'frozen' as const, role: 'source' },
    { status: 'closed' as const, role: 'destination' },
    { status: 'dormant' as const, role: 'source' },
  ])('"Dora SGD" $status, chosen as the $role: "ACME-000105 is $status."', async ({ status, role }) => {
    setUp({ accounts: ledgerAccounts({ doraStatus: status }) });
    renderScreen();
    await openRecordTransfer();

    await fill(role === 'source' ? { source: OPTION.doraSgd } : { destination: OPTION.doraSgd });

    expect(inPanel().getByText(`ACME-000105 is ${status}.`)).toBeInTheDocument();
  });

  it('the presence half: an active account chosen says nothing of its status', async () => {
    setUp();
    renderScreen();
    await openRecordTransfer();

    await fill({ destination: OPTION.doraSgd });

    expect(inPanel().queryByText(/^ACME-000105 is /)).toBeNull();
  });
});

describe('The idempotency key is made when the panel opens', () => {
  it('shows the key before anything is typed', async () => {
    setUp();
    renderScreen();

    await openRecordTransfer();

    expect(inPanel().getByText('k-1')).toBeInTheDocument();
  });
});

describe('Closing a panel with unsent entries asks first', () => {
  it('with 100.00 typed in the amount: asks before dropping the unsent transfer, and keeps it on "Keep editing"', async () => {
    setUp();
    renderScreen();
    await openRecordTransfer();
    await fill({ amount: '100.00' });

    await userEvent.click(inPanel().getByRole('button', { name: 'Close details' }));

    expect(screen.getByRole('dialog', { name: /^Discard unsent/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(control('Amount')).toHaveValue('100.00');
  });
});

describe('Review transfer waits for the fields this transfer needs', () => {
  it.each([
    { entries: { destination: OPTION.bobSgd }, enabled: false, label: '"Bob SGD" only' },
    { entries: { destination: OPTION.bobSgd, amount: '100.00' }, enabled: true, label: '"Bob SGD" and 100.00' },
    { entries: { destination: OPTION.bobUsd, amount: '100.00' }, enabled: false, label: '"Bob USD" and 100.00' },
    { entries: { destination: OPTION.bobUsd, amount: '100.00', rate: '0.74' }, enabled: true, label: '"Bob USD", 100.00 and a rate of 0.74' },
    { entries: { destination: OPTION.bobSgd, amount: '100.00', fee: '2.00' }, enabled: false, label: '"Bob SGD", 100.00 and a fee of 2.00' },
    { entries: { destination: OPTION.bobSgd, amount: '100.00', fee: '2.00', feeAccount: OPTION.feesSgd }, enabled: true, label: '"Bob SGD", 100.00, a fee of 2.00 and the fee account "Fees SGD"' },
  ])('$label: Review transfer enabled $enabled', async ({ entries, enabled }) => {
    setUp();
    renderScreen();
    await openRecordTransfer();

    await fill(entries);

    const reviewButton = inPanel().getByRole('button', { name: 'Review transfer' });
    if (enabled) expect(reviewButton).toBeEnabled();
    else expect(reviewButton).toBeDisabled();
  });
});

describe('The confirm step shows the exact estimated destination amount', () => {
  it.each([
    { entries: { destination: OPTION.bobUsd, amount: '100.00', rate: '0.74', fee: '2.00', feeAccount: OPTION.feesSgd }, estimate: '72.52 USD' },
    { entries: { destination: OPTION.bobUsd, amount: '1.00', rate: '1.005', fee: '0' }, estimate: '1.01 USD' },
    { entries: { destination: OPTION.keiJpy, amount: '10.00', rate: '113.55', fee: '0' }, estimate: '1,136 JPY' },
    { entries: { destination: OPTION.bobSgd, amount: '100.00', fee: '1.00', feeAccount: OPTION.feesSgd }, estimate: '99.00 SGD' },
  ])('$entries.amount SGD to $entries.destination with a fee of $entries.fee: an estimated $estimate', async ({ entries, estimate }) => {
    setUp();
    renderScreen();
    await openRecordTransfer();
    await fill(entries);

    const dialog = await review();

    expect(dialog).toHaveTextContent(estimate);
  });
});

describe('No estimate when a value is not a number', () => {
  it.each([
    { label: 'an amount of "abc", a fee of 0, a rate of 0.74', entries: { amount: 'abc', fee: '0', rate: '0.74' }, guessed: undefined },
    // An empty fee read as 0 would give (100.00 − 0) × 0.74.
    { label: 'an amount of 100.00, an empty fee, a rate of 0.74', entries: { amount: '100.00', fee: '', rate: '0.74' }, guessed: '74.00 USD' },
    { label: 'an amount of 100.00, a fee of 0, a rate of "x"', entries: { amount: '100.00', fee: '0', rate: 'x' }, guessed: undefined },
  ])('$label: no estimate, and it says the estimate cannot be worked out', async ({ entries, guessed }) => {
    setUp();
    renderScreen();
    await openRecordTransfer();
    await fill({ destination: OPTION.bobUsd, ...entries });

    const dialog = await review();

    expect(dialog).toHaveTextContent(/estimate cannot be worked out/i);
    if (guessed) expect(dialog).not.toHaveTextContent(guessed);
  });
});

describe('Only the confirm step sends the transfer', () => {
  it('restates ACME-000101, ACME-000201, 100.00 SGD, 2.00 SGD, ACME-000103 and 0.74, and sends nothing until she confirms', async () => {
    const ledger = setUp();
    renderScreen();
    await openRecordTransfer();
    await fill(FULL);

    const dialog = await review();

    for (const restated of ['ACME-000101', 'ACME-000201', '100.00 SGD', '2.00 SGD', 'ACME-000103', '0.74']) {
      expect(dialog).toHaveTextContent(restated);
    }
    await settle();
    expect(ledger.sends()).toEqual([]);

    await confirm();

    await waitFor(() => expect(ledger.sends()).toHaveLength(1));
    const [sent] = ledger.sends();
    expect(sent.headers.get('Idempotency-Key')).toBe('k-1');
    const body = JSON.parse(sent.body!.replace(/:\s*(-?\d+(?:\.\d+)?)(?=\s*[,}])/g, ':"$1"')) as Record<string, string>;
    expect(body).toMatchObject({
      sourceAccountId: ID.alice,
      destinationAccountId: ID.bobUsd,
      amount: '100.00',
      sourceCurrency: 'SGD',
      destinationCurrency: 'USD',
      exchangeRate: '0.74',
      fee: '2.00',
      feeAccountId: ID.feesSgd,
    });
  });
});

/** Mai confirmed {@link FULL} and the ledger answered `refusal`. */
async function confirmRefused(refusal: Answer): Promise<ReturnType<typeof stubLedger>> {
  const ledger = setUp({ record: async () => refusal });
  renderScreen();
  await openRecordTransfer();
  await fill(FULL);
  await review();
  await confirm();
  await waitFor(() => expect(ledger.sends()).toHaveLength(1));
  await settle();
  return ledger;
}

describe('A refusal marks the field at fault', () => {
  it.each([
    { code: 'INVALID_POSTING_AMOUNT', field: 'Amount', serviceField: 'Amount' },
    { code: 'CONVERTED_AMOUNT_TOO_SMALL', field: 'Amount', serviceField: 'Amount' },
    { code: 'SAME_ACCOUNT_TRANSFER', field: 'Destination account', serviceField: 'DestinationAccountId' },
    { code: 'EXCHANGE_RATE_REQUIRED', field: 'Rate', serviceField: 'ExchangeRate' },
    { code: 'EXCHANGE_RATE_NOT_ALLOWED', field: 'Rate', serviceField: 'ExchangeRate' },
    { code: 'INVALID_EXCHANGE_RATE', field: 'Rate', serviceField: 'ExchangeRate' },
    { code: 'INVALID_FEE', field: 'Fee', serviceField: 'Fee' },
    { code: 'FEE_ACCOUNT_REQUIRED', field: 'Fee account', serviceField: 'FeeAccountId' },
    { code: 'INVALID_FEE_ACCOUNT', field: 'Fee account', serviceField: 'FeeAccountId' },
    { code: 'INSUFFICIENT_FUNDS', field: 'Source account', serviceField: undefined },
    { code: 'ACCOUNT_DORMANT_DEBIT_REFUSED', field: 'Source account', serviceField: undefined },
  ])('$code marks the $field', async ({ code, field, serviceField }) => {
    await confirmRefused(refused(422, { code, message: `Refused: ${code}.`, field: serviceField }));

    expect(panel()).toBeInTheDocument();
    expectFullEntriesKept();
    await waitFor(() => expect(control(field)).toHaveAttribute('aria-invalid', 'true'));
    for (const other of PANEL_CONTROLS.filter((name) => name !== field)) {
      expect(control(other)).not.toHaveAttribute('aria-invalid', 'true');
    }
    expect(panel()).toHaveTextContent(code);
  });
});

describe('A refusal with no field shows in the alert box', () => {
  it.each([
    { refusal: 'ACCOUNT_FROZEN', answer: refused(422, { code: 'ACCOUNT_FROZEN', message: 'The account is frozen.' }), shown: ['The account is frozen.', 'ACCOUNT_FROZEN'] },
    { refusal: 'ACCOUNT_CLOSED', answer: refused(422, { code: 'ACCOUNT_CLOSED', message: 'The account is closed.' }), shown: ['The account is closed.', 'ACCOUNT_CLOSED'] },
    { refusal: 'AMOUNT_OUT_OF_RANGE', answer: refused(422, { code: 'AMOUNT_OUT_OF_RANGE', message: 'The amount is outside the range the ledger records.' }), shown: ['The amount is outside the range the ledger records.', 'AMOUNT_OUT_OF_RANGE'] },
    {
      refusal: 'an account not found',
      answer: refused(404, { message: `The account ${ID.bobUsd} named by DestinationAccountId was not found.` }),
      shown: [`The account ${ID.bobUsd} named by DestinationAccountId was not found.`],
    },
    { refusal: 'LOCK_TIMEOUT', answer: refused(422, { code: 'LOCK_TIMEOUT', message: "Timed out waiting to record against one of this transfer's accounts." }), shown: ["Timed out waiting to record against one of this transfer's accounts.", 'LOCK_TIMEOUT'] },
    {
      refusal: 'IDEMPOTENCY_KEY_CONFLICT',
      answer: refused(409, { code: 'IDEMPOTENCY_KEY_CONFLICT', message: 'This idempotency key has already been used for a different request.' }),
      shown: ['This idempotency key has already been used for a different request.', 'IDEMPOTENCY_KEY_CONFLICT'],
    },
    {
      refusal: 'UNSUPPORTED_CURRENCY on the destination currency',
      answer: refused(422, { code: 'UNSUPPORTED_CURRENCY', message: "'USD' is not a supported currency.", field: 'DestinationCurrency' }),
      shown: ["'USD' is not a supported currency.", 'UNSUPPORTED_CURRENCY'],
    },
    {
      refusal: 'CURRENCY_MISMATCH on the source currency',
      answer: refused(422, { code: 'CURRENCY_MISMATCH', message: "The source currency does not match the source account's.", field: 'SourceCurrency' }),
      shown: ["The source currency does not match the source account's.", 'CURRENCY_MISMATCH'],
    },
    { refusal: 'a missing idempotency key', answer: refused(400, { message: "'Idempotency Key' must not be empty.", field: 'IdempotencyKey' }), shown: ["'Idempotency Key' must not be empty."] },
    { refusal: 'UNKNOWN_REFUSAL, a code no list above names', answer: refused(422, { code: 'UNKNOWN_REFUSAL', message: 'A refusal the console has never seen.' }), shown: ['A refusal the console has never seen.', 'UNKNOWN_REFUSAL'] },
  ])('$refusal: shown in the alert box, no field marked', async ({ answer: refusal, shown }) => {
    await confirmRefused(refusal);

    expect(panel()).toBeInTheDocument();
    expectFullEntriesKept();
    const alerts = await inPanel().findAllByRole('alert');
    for (const text of shown) {
      expect(alerts.some((alert: HTMLElement) => alert.textContent?.includes(text))).toBe(true);
    }
    for (const name of PANEL_CONTROLS) {
      expect(control(name)).not.toHaveAttribute('aria-invalid', 'true');
    }
  });
});

describe('A retry after a refusal or no answer reuses the same key', () => {
  it.each([
    { outcome: 'the ledger refused it with INSUFFICIENT_FUNDS', first: async () => refused(422, { code: 'INSUFFICIENT_FUNDS', message: 'The debit would take the account past its floor.' }) },
    { outcome: 'the ledger did not answer, and the panel said so', first: () => Promise.reject(new TypeError('fetch failed')) },
  ])('$outcome: confirming again sends under the key "k-1"', async ({ first }) => {
    const ledger = setUp({ record: inTurn(first, async () => refused(422, { code: 'INSUFFICIENT_FUNDS', message: 'Still refused.' })) });
    renderScreen();
    await openRecordTransfer();
    await fill(FULL);
    await review();
    await confirm();
    await waitFor(() => expect(ledger.sends()).toHaveLength(1));
    await waitFor(() => expect(inPanel().queryAllByRole('alert').length + inPanel().queryAllByText(NO_ANSWER_TEXT).length).toBeGreaterThan(0));

    await review();
    await confirm();

    await waitFor(() => expect(ledger.sends()).toHaveLength(2));
    expect(ledger.sends().map((send) => send.headers.get('Idempotency-Key'))).toEqual(['k-1', 'k-1']);
  });
});

describe('No answer from the ledger is stated in the panel', () => {
  it.each([
    { form: "the console's own no-answer reply (502)", answer: () => Promise.resolve(refused(502, { message: 'The ledger service cannot be reached.' })) },
    { form: 'the request failing in the browser', answer: () => Promise.reject(new TypeError('fetch failed')) },
  ])('$form: the panel stays open with her entries and says the ledger did not answer', async ({ answer: noAnswer }) => {
    const ledger = setUp({ record: noAnswer });
    renderScreen();
    await openRecordTransfer();
    await fill(FULL);
    await review();
    await confirm();

    expect(await inPanel().findByText(NO_ANSWER_TEXT)).toBeInTheDocument();
    expectFullEntriesKept();
    expect(inPanel().getByText('k-1')).toBeInTheDocument();
    expect(ledger.sends()).toHaveLength(1);
  });
});

describe('A recorded transfer closes the panel and is acknowledged', () => {
  it('closes the panel, notes 100.00 SGD sent and 72.52 USD recorded, reads the list again and mints a new key', async () => {
    const ledger = setUp({ record: async () => answer({ ...transferRow({ idempotencyKey: 'k-1' }), postings: [] }, 201) });
    renderScreen();
    await openRecordTransfer();
    await fill(FULL);
    await review();
    const readsBefore = ledger.listReads(ID.alice).length;

    await confirm();

    const note = await screen.findByRole('status');
    expect(note).toHaveTextContent('Transfer recorded');
    expect(note).toHaveTextContent('100.00 SGD');
    expect(note).toHaveTextContent('72.52 USD');
    expect(screen.queryByRole('complementary', { name: 'Details' })).toBeNull();
    await waitFor(() => expect(ledger.listReads(ID.alice).length).toBeGreaterThan(readsBefore));

    await userEvent.click(screen.getByRole('button', { name: 'Record transfer' }));
    await screen.findByRole('complementary', { name: 'Details' });
    expect(inPanel().queryByText('k-1')).toBeNull();
    expect(inPanel().getByText(/^k-\d+$/)).toBeInTheDocument();
  });
});

describe('A retry answered with the already recorded transfer counts as recorded', () => {
  it('no answer, then the replayed transfer under "k-1": the panel closes and notes 100.00 SGD sent and 74.00 USD recorded', async () => {
    const recorded = { ...transferRow({ fee: '0.00', feeAccount: null, converted: '74.00', idempotencyKey: 'k-1' }), postings: [] };
    const ledger = setUp({ record: inTurn(() => Promise.reject(new TypeError('fetch failed')), async () => answer(recorded, 200)) });
    renderScreen();
    await openRecordTransfer();
    await fill({ destination: OPTION.bobUsd, amount: '100.00', rate: '0.74' });
    await review();
    await confirm();
    await inPanel().findByText(NO_ANSWER_TEXT);

    await review();
    await confirm();

    const note = await screen.findByRole('status');
    expect(note).toHaveTextContent('Transfer recorded');
    expect(note).toHaveTextContent('100.00 SGD');
    expect(note).toHaveTextContent('74.00 USD');
    expect(screen.queryByRole('complementary', { name: 'Details' })).toBeNull();
    expect(ledger.sends().map((send) => send.headers.get('Idempotency-Key'))).toEqual(['k-1', 'k-1']);
  });
});
