# Components and tokens

## shadcn/ui primitives

Installed unmodified into `components/ui/`. Theming happens through tokens, not by
editing these files.

`table` · `form` · `input` · `select` · `checkbox` · `switch` · `textarea` · `button` ·
`dialog` · `alert-dialog` · `sheet` · `popover` · `calendar` · `command` · `badge` ·
`card` · `tabs` · `tooltip` · `skeleton` · `separator` · `breadcrumb` · `dropdown-menu` ·
`sonner` · `pagination` · `scroll-area` · `avatar` · `collapsible`

## Domain components

Everything the console adds sits in `components/ledger/`.

### `<Money>` — the one that matters

```tsx
<Money amount={12400} currency="SGD" />            // 12,400.00
<Money amount={-500} currency="SGD" signed />      // −500.00
<Money amount={0} currency="JPY" />                // 0
```

Rules, all of them non-negotiable:

- **Decimals come from the currency**, looked up from `Currency.decimalPlaces` — never a
  hard-coded `2`. JPY has none; a three-decimal currency exists.
- **Tabular numerals**, `font-variant-numeric: tabular-nums`, so columns align.
- **Right-aligned** in every table.
- **Sign is a character**, `+` / `−` (U+2212, not a hyphen), never colour alone. Colour
  is a second channel, added on top, never the only one.
- **`Math.round` is banned.** Amounts are decimal money. Parse and validate as strings
  against the currency's precision; do not route them through float arithmetic.

### `<Currency>`

A currency code with its country flag: `🇸🇬 SGD`. Used at every site that names a currency
— table cells, balance-tile captions, panel fields, group balance lines.

- **The code is always present.** A flag alone is not a currency; several countries use
  the dollar, and 🇺🇸 alone cannot distinguish USD from a US-domiciled account.
- **The flag is decorative** — `aria-hidden`, carrying nothing the code does not.
- **The slot is fixed at 19px** whether or not a flag exists, so a column stays aligned.
- **Never in prose.** Body text mentioning a currency uses the bare code.

**Not every currency has a country.** XAU and XAG (gold, silver) and XDR (IMF drawing
rights) have none; EUR maps to a union rather than a country. Those render the code alone
in the reserved slot, with no substitute globe or question mark — an invented symbol would
imply a fact that isn't there.

The mockups use Unicode regional-indicator emoji to stay self-contained. **That is a
mockup decision.** Windows ships no colour flag glyphs and renders 🇸🇬 as the letters *SG*.
The console should ship a real flag set — `flag-icons` or build-time inline SVG — keyed by
ISO 3166-1 alpha-2, with the currency-to-country map held as data beside the currency
reference the service already serves.

### `<BalanceTiles>`

Renders `balance`, `availableBalance`, `heldAmount` as three tiles plus the computed
floor line. It takes the whole account and cannot be asked to render one value — the
component's shape is what stops "just show the balance" from creeping back in.

### `<LedgerTable>`

One table for groups, accounts and currencies. Wraps the shared list contract:

```ts
type LedgerColumn<T> = {
  key: string            // the DTO field name
  header: string
  sortable: boolean      // MUST be false for availableBalance and openedOn
  queryAs?: string       // e.g. 'CurrencyCode' when the query name differs from the body's
  align?: 'left' | 'right'
  render?: (row: T) => ReactNode
}
```

Builds `filter=Field:Op:Value` (repeatable, AND-ed, max 20), `search` (min 2 chars),
`orderBy` / `desc`, `pageNumber` / `pageSize`. Reads and writes the URL.

`sortable` and `queryAs` exist because the API's query surface and its response shape are
deliberately not identical. See [04-api-map.md](04-api-map.md).

### `<StatementTable>`

Not `LedgerTable`. Different paging parameters (`pageIndex`), different ordering
guarantee (stream order, unsortable), different row semantics (reversal lineage,
struck-through amounts). Sharing one component between them would mean a `variant` prop
that changes almost everything — two components is less code than that.

### The rest

| Component | Purpose |
|---|---|
| `<StatusBadge>` | Account, group, posting and currency statuses. One colour map, in one place |
| `<AccountNumber>` / `<PostingNumber>` | Monospace, copy-on-click, linked |
| `<MetadataEditor>` | The `IReadOnlyDictionary<string,string>` key/value editor |
| `<RefusalAlert>` | Renders `errors[]` — field-scoped errors inline, the rest as a block |
| `<ScopeGate>` | Disables children and states the required scope |
| `<ConfirmMovement>` | The restate-in-words dialog used by record, batch and reverse |
| `<IdempotencyKeyField>` | Mints on mount, displays, regenerates on reset |
| `<CurrencyBalanceList>` | Group balances, one row per currency, with the not-summed note |
| `<FloorLine>` | The computed floor from the three policy fields |
| `<DateRangeFilter>` | Presets plus custom range, URL-bound, future dates blocked where required |

## Design tokens

Derived from the shadcn banking dashboard template at `shadcnuidashboard.com/banking`,
read from its computed custom properties. Token **names follow shadcn's own semantics**
(`--background`, `--card`, `--muted`, `--border`, `--input`, `--ring`, `--primary`) so the
installed primitives theme themselves with no mapping layer.

### Surfaces — three levels

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `#f5f5f5` | `#0a0a0a` | Page ground and sidebar |
| `--card` | `#ffffff` | `#171717` | Cards, tables, balance tiles |
| `--muted` | `#ebebeb` | `#262626` | Row hover, table headers, badges |

Cards separate from the ground by their own surface, not by elevation. `--shadow-card`
is barely visible in light and `none` in dark, where the card is the lighter surface.

### Text and structure

| Token | Light | Dark | Notes |
|---|---|---|---|
| `--foreground` | `#0a0a0a` | `#fafafa` | 18:1 on card |
| `--muted-foreground` | `#5c5c5c` | `#a1a1a1` | Clears 4.5:1 on **all three** surfaces in both themes |
| `--border` | `#e5e5e5` | `#2e2e2e` | Hairlines only |
| `--input` | `#737373` | `#737373` | Control borders — clears 3:1 |
| `--primary` / `--ring` | `#1d4ed8` | `#7aa2ff` | Actions, links, focus |

### Ledger signals

| Token | Light | Dark | Use |
|---|---|---|---|
| `--credit` | `#166534` | `#4ade80` | Credit amounts — **always beside a `+`** |
| `--debit` | `#9f1239` | `#fb7185` | Debit amounts — **always beside a `−`** |
| `--warning` | `#92400e` | `#fbbf24` | Guarded actions and consequence warnings |
| `--destructive` | `#b91c1c` | `#ff6467` | Refusal messages |
| `--reversed` | `#666666` | `#949494` | Struck-through reversed rows |

Colour is never the only carrier of meaning: sign, strike-through and badge text carry it
too, so every table reads correctly in greyscale.

### What was deliberately not taken from the template

- **Its orange accent.** Orange reads as a warning in a ledger, and `--warning` is a real
  signal here meaning an account is frozen. Chrome must not compete with a signal.
- **`--primary` as near-black.** The primary action on most screens records a posting,
  which moves money and cannot be undone. It must not look like a neutral button.
- **16px body text.** This console is scanned for hours; 14px body and 13px table.
- **Its `muted-foreground` on `muted` pair**, which measures 4.37:1 — under the threshold.
  Ours is darker and clears 5.6:1 on the same surface.

### Status badges

Filled tint pills, taken from the Cargorix logistics template — `radius-full`, 12px at
weight 500, `2px 8px`, no border. Brighter than a grey chip with coloured text.

| Variant | Light bg / fg | Dark bg / fg | Used for |
|---|---|---|---|
| credit | `#dcfce7` / `#14532d` | `#14532d` / `#86efac` | Active account, group, currency |
| warning | `#fef3c7` / `#78350f` | `#78350f` / `#fcd34d` | Dormant — debits refused |
| debit | `#ffe4e6` / `#881337` | `#881337` / `#fda4af` | Frozen — no movement at all |
| info | `#dbeafe` / `#1e3a8a` | `#1e3a8a` / `#93c5fd` | Posted |
| neutral | `#ebebeb` / `#3f3f46` | `#262626` / `#d4d4d4` | Closed, Inactive, Reversed |

Severity is carried by hue: amber blocks half of what you can do, rose blocks all of it.

**The source template's own badge values were not copied.** Measured from its computed
styles, its amber-on-amber-tint pair is **2.86:1** and its neutral pair **4.14:1** — both
under 4.5:1. Every pair above clears 4.5:1 in both themes.

A pill is allowed on a badge and still banned on a button: the filled tint and the absence
of hover already say a badge is not a control.

### Typography

| Role | Family | Size / leading |
|---|---|---|
| UI | Plus Jakarta Sans | 14px / 20px body, 13px / 18px table |
| Numeric | Plus Jakarta Sans, `tabular-nums` | 13px / 18px row, 22px / 28px tile |
| Identifiers | JetBrains Mono | 13px — account and posting numbers, group codes, ids |

Identifiers are monospace because they are compared by eye. `ACME-000123` against
`ACME-000132` is a one-glance difference in mono and a two-read difference in a
proportional face.

> Plus Jakarta Sans is wider than Inter at the same size. If the statement table proves
> cramped at 13px once real data is in it, the fix is to keep the face for interface text
> and set `table-cell`, `amount` and `id-inline` in Inter — not to shrink the type.

### Spacing, radius and density

A 4px scale: `4 · 8 · 12 · 16 · 24 · 32 · 48`. `--radius` is 10px, with `sm` 6px on
badges, `md` 8px on controls, `lg` 10px on cards, `xl` 14px on dialogs. `radius-full` is
for status dots only.

Dense table rows: 36px, 12px horizontal cell padding. This console is read for long
stretches by people scanning for one row, so default to the denser end: compact rows,
restrained whitespace, and no decorative imagery anywhere.
