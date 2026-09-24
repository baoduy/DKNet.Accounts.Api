# DKNet Accounts Console — Design System

The design system for the **DKNet Accounts Console**, the operations and administration
interface over `DKNet.Accounts.Api`. One product, one surface: a desktop web console used
for long stretches by ledger operations staff.

## Sources

Everything here is derived from a single attached codebase, mounted read-only as `Design/`:

| Path | What it is |
|---|---|
| `Design/README.md` | Product framing, decisions on record, API constraints, the Overview gap |
| `Design/01-architecture.md` | App architecture, BFF and auth, data layer, project layout |
| `Design/02-screens.md` | Every screen: layout, states, actions, empty and error cases |
| `Design/03-components.md` | Component inventory, design tokens, money and number rules |
| `Design/04-api-map.md` | Route map, query-surface traps, the refusal vocabulary |
| `Design/mockups/*.html` | Static, self-contained mockups of all nine screens, both themes |
| `Design/mockups/tokens.css` | The compiled token set — the source of every value in `tokens/` |

No Figma file, no GitHub repository and no slide deck were supplied. The codebase itself is
a design specification rather than a running application: the `ui/` app it describes had
not been built. Token values, screen structure and copy in this system are transcribed from
those files, not invented.

`Design/03-components.md` notes that the tokens were originally read from the computed
custom properties of the shadcn banking dashboard template at `shadcnuidashboard.com/banking`,
and that the status-badge treatment came from the Cargorix logistics template — with several
of both templates' values deliberately rejected. See *What was deliberately not taken*, below.

## What the console is for

Two areas of equal weight under one navigation tree:

- **Ledger** — account groups, accounts, balances, statements, postings. Read-heavy
  investigation work with guarded write actions.
- **Administration** — currencies and reference data.

The shape of the API drives the shape of the UI. There is no transactions list because the
API exposes no route that lists postings across accounts. Two columns on the accounts table
carry no sort control because sorting them is a `400`. Money is never rendered as a single
number because `Balance`, `AvailableBalance` and `HeldAmount` are three distinct values.
These are not stylistic preferences; violating them produces a wrong number or an error.

---

# Content fundamentals

**The console states consequences before the click, not after it.** This is the single
strongest characteristic of its copy. An action the service would refuse is rendered
disabled with the reason and the refusal code beside it:

> Balance is 12,400.00 — closing is refused with `ACCOUNT_HOLDS_BALANCE`.

> Debits are disabled: this account is dormant. A credit can still be recorded.

**Person.** Almost no pronouns. The copy addresses the record, not the reader: *"This
account still holds a balance and cannot be closed"*, not *"You cannot close this account"*.
The second person appears only where permission is genuinely about the person:
*"You do not have permission to do this"*. The first person never appears.

**Tone.** Plain, declarative, unhedged. No "please", no "oops", no apology, no exclamation
marks. Refusals are stated as facts about the system, which is what they are. Where a
behaviour is non-obvious, the UI explains *why* in one sentence rather than hiding it:

> Balances are reported per currency and are never combined into a single total.

> Stream order — this table does not sort. **Balance after** is the balance at that point
> in the stream.

> Minted when this form opened, sent as the `Idempotency-Key` header, and regenerated only
> after a success. A double-click replays the first request and answers 200, not 201.

Those explanatory notes are a real element of the design, not commentary. Ledger work is
done by people who must trust a number; an unexplained blank or a missing control reads as
a bug unless the interface says otherwise.

**Casing.** Sentence case everywhere — page titles, buttons, table headers, dialogs.
`ALL CAPS` is reserved for two things: the 11px tracked tile and section labels
(`BALANCE`, `AVAILABLE`, `IDEMPOTENCY`, `REVERSAL LINEAGE`), and the sidebar's section
headings (`LEDGER`, `ADMINISTRATION`). Refusal codes are `SCREAMING_SNAKE_CASE` in
monospace and are always shown in full — the code is what gets quoted in a ticket.

**Labels are the API's own words.** `Account no.`, `Effective`, `Recorded`, `Balance after`,
`Stream position`, `Idempotency key`, `Calling system`, `Transaction group`. Nothing is
softened into a friendlier synonym; an operator comparing the UI against an API response
should see the same nouns.

**Buttons are verbs with their object.** *Record posting*, *View statement*, *Close account*,
*Close group*, *Reverse*, *Open account*, *Add currency*, *Review movement*. Never *Submit*,
*OK* or *Continue*.

**Numbers in prose are formatted the way they are in the table** — grouped, to the
currency's own precision, with U+2212 for the minus sign.

**Three empty states, three messages**, because they mean three different things:
*"No postings recorded on this account."* / *"No postings between 1 Jan and 31 Jan."* /
*"No more postings."* A single "No results" would erase the difference.

**No emoji.** The only Unicode pictograph in the entire system is the regional-indicator
flag beside a currency code, which is decorative, `aria-hidden`, and carries nothing the
code does not. Arrows (`→`, `↕`, `↑`, `↓`) and the minus sign are used as typographic
characters, not as icons.

**Dates** read `21 Sep 2026`; timestamps `19 Sep 2026 14:41:08 UTC`, with the zone stated.
In dense table cells the year drops: `19 Sep 14:41`.

---

# Visual foundations

## Colour

The palette is the supplied shadcn/ui theme, carried over verbatim: a Tailwind slate
neutral ramp with a lime primary, in sRGB hex throughout.

**Three surfaces, and a card lifts off the ground.** `--background` `#fbfcf8` is an
off-white carrying a trace of warmth against the slate; `--card` and `--popover` are pure
white on top of it; `--muted` `#f1f5f9` carries table headers, row hover and chips. A card
is told apart from the ground by value, by its 1px hairline and by the shadow together. In
dark the order holds: `#020617` ground, `#0f172a` card, `#1e293b` muted.

**Lime `#aff33e` is the single action colour** in both themes, with black text on it at
15.7:1. Selection — the active nav item, a picked table row, a selected chip — is a wash of
that same hue, `--surface-selected` `#d4f094`. The theme's own `--accent` `#f0fdf4` cannot
carry selection: it is *lighter* than `--muted` `#f1f5f9` and all but identical to the page
ground, so a selected row read paler than a hovered one. `--accent` is kept verbatim for
shadcn primitives; selection uses the wash. In dark the theme's `--accent` `#14532d` is
already darker than `--muted`, so `--surface-selected` takes it as given. There is no second
brand hue and no gradient anywhere.

**Lime is a fill — never text, and never a focus ring.** As text on the page ground the
primary measures 1.30:1, so `--link` carries links instead: the theme's slate `#334155` in
light, and the lime itself in dark, where it clears 4.5:1 against the dark ground. `--ring`
has the same problem — the lime measures 1.34:1 against a card, and a focus ring needs 3:1
against the surface beside it — so focus is drawn with `--focus-ring` (the slate in light,
the lime in dark).

**Four signal hues, spaced away from lime.** These are the theme's own green, rose and
orange families taken to the darker steps that text needs. `--credit` is a true green
(`#15803d` / `#4ade80`), never a yellow-green, so a credit amount is never mistaken for the
primary in the same row. `--warning` is orange (`#9a3412` / `#fb923c`), not amber, for the
same reason. `--debit` is rose (`#be123c` / `#fb7185`), `--reversed` the slate of
`--muted-foreground`. `--scrim` `rgba(15,23,42,.4)` sits behind a dialog — the slate ink,
never black.

**Interaction states are tokens, not effects.** Hover on a filled control shifts the fill:
`--primary-hover` `#9ee62b`, `--destructive-hover` `#b91c1c`. Button previously faded
primary and destructive with `opacity: 0.9`, which on an off-white ground washes the lime
out instead of deepening it — and it was the one interaction in the system not drawn from a
token. Hover on an unfilled surface — a bordered button, a ghost button, a nav item, a table
row, a chip — is `--surface-hover`; hovering an already-selected row or chip deepens to
`--surface-selected-hover`. In dark both hovers lighten rather than darken, because the
ground is already dark. `Chip` had `cursor: pointer` and no hover state at all, so `Tabs`,
which is built on it, gave no feedback on the thing you were about to click.

**Disabled is repainted, not faded.** `--surface-disabled` with `--text-disabled` clears
4.65:1 in light (`#e9eef4` on `#5d6b7e`) and 5.73:1 in dark (`#1e293b` on `#94a3b8`), and a
disabled primary stops being lime — which is what disabled
should look like. This matters more here than in most systems: `ScopeGate` keeps a refused
action on screen precisely so it can be read, and the previous `opacity: 0.45` fade put a
black label on pale lime at **2.93:1**, making the refused action the least legible text on
the page. `ScopeGate` now passes `disabled` down to its child instead of fading a wrapper.

No component state is expressed as an opacity fade any more — not disabled controls, not
`ScopeGate`, not the inactive sort arrow in `LedgerTable` (which was a glyph at `0.55`).
The only `opacity` left in the components is `opacity: 0` on the visually-hidden checkbox
and switch inputs, which is a screen-reader technique rather than a visual state.

**Colour is never the only carrier.** A credit is `+892.45` in emerald; a debit is
`−892.45` in rose; a reversed row is struck through. Every table reads correctly in
greyscale.

**Contrast is a constraint, not an outcome.** Every foreground clears 4.5:1 against all
three of its own theme's surfaces, and every badge pair clears 4.5:1 in both themes.

Getting there took five interventions, because the supplied theme inherits four failures
from shadcn's own defaults. In each case the theme token is **preserved verbatim** so a
shadcn primitive gets exactly the value it expects, and this system's own components use an
accessible alias beside it:

| Theme token | Measured | Alias used by this system |
| --- | --- | --- |
| `--input` `#e2e8f0` — identical to `--border` | 1.23:1 on a card | `--border-control` `#7d8b9f`, 3.5:1 |
| `--ring` — the lime | 1.34:1 on a card | `--focus-ring` `#334155`, 10.4:1 |
| `--destructive` `#ef4444` with white text | 3.76:1 | `--destructive-solid` `#dc2626`, 4.8:1 |
| `--accent` `#f0fdf4` — lighter than `--muted` | selection paler than hover | `--surface-selected` `#d4f094` |

All seven form controls — input, select, textarea, checkbox, switch, the date-range filter
and the default button — border with `--border-control`, so a text field in a data-entry
ledger has a visible edge. `base.css` draws focus with `--focus-ring`. Button's destructive
variant fills with `--destructive-solid`.

The fifth is a changed value rather than an alias: `--muted-foreground` in light is darkened
from the theme's `#64748b` to `#5d6b7e`. At the supplied value it measures 4.34:1 on
`--muted`, and `--muted` is every table header in the product. The two are
near-indistinguishable side by side, and this is the only deviation from the theme as given.

If you are theming shadcn primitives directly rather than using this system's components,
these are the overrides to carry across:

```css
:root {
  --input: var(--border-control);
  --ring: var(--focus-ring);
  --destructive: var(--destructive-solid);
  --accent: var(--surface-selected);
}
```

**The shadcn/ui contract is complete.** Token names and roles match shadcn exactly, so a
primitive installed from shadcn themes itself with no mapping layer: the full base set
(`background`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`,
`border`, `input`, `ring`, each with its `-foreground` where shadcn defines one), the
`--chart-1`…`--chart-5` series, and the whole `--sidebar-*` block. Radius derives from a
single `--radius` the shadcn way (`--radius-sm/md/lg/xl` are `calc()` off it), so overriding
that one value retunes every primitive at once. Dark is carried on three selectors —
`.dark` (Tailwind's class variant), `[data-theme="dark"]`, and the OS preference — so the
system drops into a Tailwind project and a plain one alike. One caution for anyone editing
`tokens/colors.css`: the dark values are written twice, once per selector, and **the two
blocks must agree** — a value that diverges is invisible in whichever path you are not
testing. The media block may omit a token only where light and dark share the same value. The `--shadow-2xs`…`--shadow-2xl`
scale and `--font-sans` / `--font-mono` / `--font-serif` are present under their shadcn
names too.

## Type

Inter for interface and numerals; JetBrains Mono for identifiers; Georgia in the serif slot,
unused by any component. These are the three families the supplied theme names, and the
system now uses them as named. Body is 14px
and table text 13px — deliberately denser than the 16px of the source template, because
this console is scanned for hours. Weights: 400 body, 500 badge, 600 label and button,
700 title and amount, 800 wordmark.

Numerals are `tabular-nums` everywhere and right-aligned in every table. Identifiers are
monospace because they are compared by eye.

Tracking lives entirely in `tokens/typography.css` — it was previously split between that
file and `spacing.css`, which is where the inconsistency crept in. Two sets, both public:
the theme's named scale (`--tracking-tighter` … `--tracking-widest`, derived from
`--tracking-normal` `-0.01em` by the theme's own `calc()`), and the role values the
console's type uses (`--tracking-title` `-0.02em`, `--tracking-label` `0.05em`,
`--tracking-section-label` `0.06em`, `--tracking-table-head` `0.03em`). Uppercase labels
need more than the scale gives, which is why the role set exists.

## Layout

Fixed 224px sidebar, fixed 56px top bar, 28px page padding, 20px between page sections.
The sidebar's two sections are pinned apart: LEDGER at the top, ADMINISTRATION pushed to
the foot with `margin-top: auto`. Table rows are 44px with 16px horizontal and 12px vertical
cell padding. Detail screens use a two-column grid; the balance tiles are a three-up flex row.

**Every grid track that must shrink is `minmax(0, 1fr)`, never bare `1fr`.** A bare `1fr`
carries `min-width: auto`, so a track holding a `white-space: nowrap` table sizes to that
table's min-content width and starves the track beside it — the Overview screen's two
columns resolved to a 27/73 split rather than 50/50 for exactly this reason. Since most
tables in this console are nowrap by design, the `minmax(0, …)` form is the rule here, not
a special case.

**Everything derives from `--spacing` (0.25rem) by a whole multiple.** The console
previously carried 14px and 11px cell padding, 7px and 10px field padding, 9px gaps and a
1px chip inset — all off the 4px grid for no reason. Those are now 16/12, 8/12, 8 and 2/8,
and the tables read `--cell-padding-x` / `--cell-padding-y` instead of hardcoding what the
tokens already said. Buttons and fields resolve to the same 36px height at `md`, so a
toolbar mixing the two aligns.

Density is the design's defining choice: compact rows, restrained whitespace, and no
decorative imagery anywhere. There are no photographs, no illustrations, no patterns, no
textures, no background images and no full-bleed art in this product. A page is surfaces,
hairlines and type.

## Borders, shadow and radius

Structure is drawn with **hairlines**, and depth is now a soft lift rather than nothing.
`--border` (`oklch(.9288 .0126 255.51)` / `oklch(.2795 .0368 260.03)`) is a 1px line and
appears on cards, table rows, card bars and the panel edge. The theme sets `--input` to that
same near-white, so form controls border with `--border-control` instead — a hairline that
measures 1.23:1 is not a border on an input.

**The theme's full shadow scale** is carried over: `--shadow-2xs` through `--shadow-2xl`,
one geometry (`0px 8px 20px`) restated at rising opacity with a tight contact shadow added
from `sm` up. Two semantic names alias into it so component code never picks a step by
number: `--shadow-card` is `sm` and sits on every card and table; `--shadow-overlay` is `xl`
and belongs to dialogs and the detail panel alone. That wide low-opacity spread is what
makes a white card read as lifted off the off-white ground rather than pasted onto it. In
dark the scale deepens instead of disappearing — 25px at 40% opacity.
Nothing else is elevated.

Radius derives from a single `--radius`, set to shadcn's 10px, and every component draws
from a token — nothing hardcodes a pixel radius:

| Token | Value | Used by |
| --- | --- | --- |
| `--radius-xs` | 4px | the checkbox box |
| `--radius-sm` | 6px | status dots, skeletons |
| `--radius-md` | 8px | button, input, select, textarea, date-range filter, sidebar nav item |
| `--radius-lg` | 10px | card, refusal alert, any bordered block container |
| `--radius-xl` | 14px | dialog |
| `--radius-full` | — | badge, chip, switch track and knob |

The four derivatives use the theme's own `calc()` formula unchanged; `--radius-xs` is this
system's addition. The theme ships `--radius: 1rem`, and this system sets 10px — shadcn's
default, and the value the console was designed at. Override `--radius` alone to retune all
six.

Radius is proportional to the element, not absolute. `--radius-xs` exists because 6px on a
16px checkbox is 37% of its side and reads rounder than the 8px on a 34px input beside it;
at 4px the two match. `radius-full` is for **status badges only** (and the switch, which is
a track by definition) — the pill shape is how a reader tells a label from a control, so a
button is never pill-shaped.

`CardBar` insets horizontally by `--cell-padding-x`, not `--card-padding`, so the filter bar
above a table and the footer below it line up with the column grid rather than sitting 4px
off it. That misalignment was visible in every table card in the product.

`Pagination` **is** a `CardBar` — it composes the bar rather than repeating its box. The
pager and the filter bar are the same strip at opposite ends of a card, so they have to
share one inset, one vertical rhythm and one hairline; composing guarantees that instead of
relying on two files agreeing. They previously did not: the pager had no horizontal inset at
all, leaving the foot of a card 16px out of line with its head on both sides, and no
`border-top` to mirror the bar's `border-bottom`. Never wrap `Pagination` in a `CardBar` —
that nests two strips.

Cards: white surface, 1px `--border`, 10px radius, `--shadow-card`, 20px padding, and
`overflow: hidden` so nothing a caller puts inside can paint past the border. That last part
is load-bearing: `LedgerTable` and `StatementTable` set `white-space: nowrap` on every cell,
so in a shrunk grid track their min-content width exceeds the card. Both now wrap their
`<table>` in an `overflow-x: auto` container, which scrolls the columns inside the card
instead of breaching it and dragging `<main>` into a page-wide horizontal scrollbar. A wide
table is a scroll region, never an overflow.
No coloured left border as decoration — the one exception is semantic, a 3px `--primary`
rule on the reversal-lineage block and a 3px `--credit` rule on a success block.

## Transparency and blur

Neither is used. Every surface is opaque, there is no backdrop blur, no scrim over a
dialog beyond a flat translucent black, and no protection gradient — because there is no
imagery to protect text against. Disabled controls are repainted with `--surface-disabled` and `--text-disabled` rather than
faded, so transparency appears nowhere in the components at all — only in `--scrim`, behind
a dialog.

## Motion

Almost none, and all of it structural. The detail panel slides in over 180ms
(`--duration-panel` / `--easing-panel`, plain `ease`) and the page's right padding animates
with it. There are no entrance animations, no fades on mount, no bounces, no spinners on
tables — a table that collapses to a spinner and back makes the page jump, so loading uses
skeletons matching the final layout.

## Hover and press

Hover is a **surface change, never a colour change**: a table row and a sidebar item take
`--muted`; a selected row and the active nav item take `--accent`. Links underline on hover
and do not change colour. Buttons darken slightly. There is no scale, no lift, no shadow
growth, and no press-shrink; the pressed state is the same darkening held. Focus is a 2px
`--ring` outline at 2px offset; a focused input or textarea hides its own border line so the
ring is the only edge, and controls built on a shell — an input with a prefix icon, a Select
— carry the ring on the shell rather than the inner field.

## What was deliberately not taken from the source templates

- **The banking template's orange accent.** Orange reads as a warning in a ledger, and
  `--warning` is a real signal here. Chrome must not compete with a signal.
- **A second blue.** Blue belongs to `--primary` alone, so the informational badge pair
  sits in the navy family: an info badge and a link must never be the same colour.
- **`--primary` as near-black** — see above.
- **16px body text** — replaced with 14px body and 13px table.
- **The template's `muted-foreground` on `muted` pair**, which measures 4.37:1. Ours is
  darker and clears 5.6:1 on the same surface.
- **The Cargorix badge values.** Its amber-on-amber-tint pair measures 2.86:1 and its
  neutral pair 4.14:1. Every pair in this system clears 4.5:1 in both themes.

---

# Iconography

**Lucide**, line only, at 1.5 stroke weight on a 24 viewBox, always `currentColor`, never
filled. 16px inline and in navigation; 20px beside a page title. The glyphs the
console actually uses are copied into `assets/icons/` as individual SVG files and are also
compiled into the `Icon` component's `ICON_PATHS` map, so a consumer can render one without
a network request:

`layout-dashboard` · `folder` · `wallet` · `arrow-left-right` · `coins` · `file-text` ·
`search` · `chevron-down` · `chevron-right` · `x` · `copy` · `check` · `triangle-alert` ·
`plus` · `arrow-right` · `info` · `rotate-ccw` · `pencil` · `filter` · `lock` · `calendar` · `snowflake` ·
`download`

These are the exact path data used in `Design/mockups/`, extracted glyph by glyph — the
five navigation icons and the file-text statement icon come straight from the mockup
markup; the remainder are the matching Lucide glyphs for states the mockups describe in
prose (copy-on-click, refusal, reverse, scope lock, date range, freeze). If you need a glyph
that is not here, take it from Lucide at the same weight rather than drawing one.

**There is no icon font and no sprite sheet.** There are no PNG icons.

**No emoji as iconography.** The one Unicode pictograph in the system is the
regional-indicator country flag beside a currency code. That is a mockup-era decision that
the shipped console should replace: Windows has no colour flag glyphs and renders 🇸🇬 as the
letters *SG*. The real console should ship `flag-icons` or build-time inline SVG keyed by
ISO 3166-1 alpha-2, with the currency-to-country map held as data beside the currency
reference the service already serves. `CURRENCY_COUNTRY` in `components/ledger/Currency.jsx`
is that map today.

**Arrows and symbols used as glyphs:** `↕` `↑` `↓` in sortable table headers, `→` on the
panel's *Open full page* link, `▾` on inline selects, `✕` on the panel close, `⌘K` in the
search field, and U+2212 MINUS SIGN on negative money.

---

# Logo and brand mark

**No logo file was supplied with the source material, and none has been drawn.** The
mockups set the product name in type — Inter ExtraBold, 15px, `-0.02em`,
in the sidebar — and this system does the same everywhere a mark would otherwise go.
See `guidelines/brand-wordmark.card.html`.

If a real mark exists, drop it into `assets/` and replace the `brand` slot in
`components/shell/Sidebar.jsx`; nothing else depends on it.

---

# Fonts

Both families are Google Fonts and no binaries were supplied. `tokens/fonts.css` loads them
from the Google CDN, exactly as the source mockups do. **If you have licensed local copies
of Inter and JetBrains Mono, add them to `assets/fonts/` and replace that
`@import` with local `@font-face` rules** — that is the one substitution in this system, and
it is the same source the mockups already use rather than a look-alike.

---

# Index

## Root

| File | Contents |
|---|---|
| `styles.css` | The global entry point. `@import` lines only — link this one file |
| `readme.md` | This document |
| `SKILL.md` | Agent-skill front matter, for use outside this project |
| `thumbnail.html` | The system's homepage tile |
| `templates/` | Starting frames a consuming project can copy — see below |

## `tokens/`

`fonts.css` (webfont loading) · `colors.css` (surfaces, text, action, ledger signals, badge
pairs, both themes, plus semantic aliases) · `typography.css` (families, size/leading pairs
by role, weights, tracking) · `spacing.css` (4px scale, radii, density, motion) ·
`elevation.css` (the two shadows) · `base.css` (document reset, link and focus styling).

Dark theme: set `data-theme="dark"` on the document, or leave it off and the OS preference
applies. `data-theme="light"` pins light.

## `components/`

**`core/`** — `Button`, `Badge`, `Chip`, `Card` (and `CardBar`), `Tabs`, `Breadcrumb`,
`Pagination`, `Separator`, `Skeleton`, `Icon`, `Label` (and `Caption`, `Note`, `Mono`).

**`forms/`** — `Input` (and `ReadOnlyField`), `Select`, `Textarea`, `Checkbox`, `Switch`,
`MetadataEditor`, `IdempotencyKeyField`, `DateRangeFilter`, `FilterMenu` (and `FilterField`).

**`ledger/`** — `Money`, `Currency`, `StatusBadge`, `AccountNumber`, `PostingNumber`,
`BalanceTiles`, `FloorLine`, `CurrencyBalanceList`, `LedgerTable`, `StatementTable`.

**`feedback/`** — `RefusalAlert`, `ScopeGate`, `Dialog`, `ConfirmMovement`, `DetailPanel`
(and `DetailList`, `DetailSection`).

**`shell/`** — `AppShell`, `Sidebar`, `PageHeader`, `UserMenu`.

Every component has a sibling `.d.ts` props contract and a `.prompt.md` usage note, and
every directory has an `@dsCard`-tagged HTML card showing its variants and states.

### Where the inventory came from

`Design/03-components.md` defines the console's own inventory in two halves: unmodified
shadcn/ui primitives in `components/ui/`, and fourteen domain components in
`components/ledger/`. All fourteen domain components are built here —`Money`, `Currency`,
`BalanceTiles`, `LedgerTable`, `StatementTable`, `StatusBadge`, `AccountNumber`,
`PostingNumber`, `MetadataEditor`, `RefusalAlert`, `ScopeGate`, `ConfirmMovement`,
`IdempotencyKeyField`, `CurrencyBalanceList`, `FloorLine` and `DateRangeFilter`.

The shadcn primitives are rebuilt here only where the console actually renders them and
where the brand's own values differ from the upstream defaults — that is what `core/` and
`forms/` are. Primitives on the source's install list that the specification never places
on a screen (`calendar`, `command`, `popover`, `sheet`, `sonner`, `scroll-area`, `avatar`,
`collapsible`, `dropdown-menu`, `tooltip`, `alert-dialog`, `form`) are **not** reimplemented:
they are upstream shadcn, unmodified by definition, and a local copy would only drift.
Install them from shadcn and theme them with these tokens — the token names follow shadcn's
own semantics precisely so that works with no mapping layer.

### Intentional additions

| Component | Why |
|---|---|
| `Icon` | The source uses raw inline Lucide SVG. A wrapper keeps the 1.5 stroke weight and the console's twenty-glyph set in one place |
| `Label` / `Caption` / `Note` / `Mono` | The mockups' `.lab`, `.cap`, `.note` and `.mono` classes, which appear on nearly every screen, given names |
| `CardBar` | The mockups' filter strip and pager strip inside an unpadded card |
| `DetailPanel` / `DetailList` / `DetailSection` | The mockups implement the right-hand panel in hand-rolled JS. `Design/03-components.md` does not list it, but every screen has one |
| `AppShell` / `Sidebar` / `PageHeader` | The frame every mockup repeats verbatim |
| `UserMenu` | The mockups' `<user> ▾` top-bar slot. The console signs in against Microsoft Entra ID, and the menu states the provider, the tenant and the scopes the token carries — a refused action here is usually a missing scope, so that list is identity, not a debug detail |
| `ReadOnlyField` | The mockups' `.fld.ro` locked-field treatment, used for the currency lock and unset values |

## `ui_kits/`

Four CRUD screens, one per entity, all on the same pattern: a filtered table card, a
right-hand panel carrying create, view and edit, a dialog only where a click has
consequence, and inline acknowledgement above the table. Each has its own `README.md`
listing its payload, its locked fields and its refusal codes. The Overview sits beside
them as the console home: search first, then charts of the ledger's position, and a card
naming the three insights this API cannot yet carry.

| Screen | Entry | Lifecycle actions |
|---|---|---|
| Overview | `ui_kits/overview/index.html` | Search, read position — no writes |
| Accounts | `ui_kits/accounts-crud/index.html` | Open, edit, close, reopen |
| Account detail | `ui_kits/account-detail/index.html?account=ACME-000123` | Record, reverse against one account |
| Records | `ui_kits/records-crud/index.html` | Record, reverse — no edit, no delete |
| Account groups | `ui_kits/account-groups-crud/index.html` | Create, edit, close, reopen |
| Currencies | `ui_kits/currencies-crud/index.html` | Register, edit, close, reopen |

Records is the one that breaks the shape, and deliberately: a posting is immutable, so the
panel offers *Reverse* where the others offer *Edit* and *Close*, and reversal requires a
reason — collected before the confirm step and kept on both records as the audit trail.

An account number is a link wherever it appears; it opens the account-detail page, which is
the Records table scoped to one account with its balances, its floor and its own record
panel above.

## `templates/accounts-console/`

`AccountsConsole.dc.html` — the console frame as a starting point: sidebar, top bar, page
header and a filtered ledger-table card, wired to the real components. Copy it and replace
the columns, rows and title. `ds-base.js` beside it is the one line to repoint when the
template lands in a consuming project.

## `guidelines/`

Eighteen specimen cards, grouped Colors · Type · Spacing · Brand: surfaces, text and
structure, action, ledger signals, status badge pairs, dark theme; the interface scale,
numerals, identifiers, weights; the spacing scale, table density, corner radii, elevation;
the wordmark, iconography, currency and flags, money rules.

## `assets/`

`assets/icons/` — the Lucide SVGs the console uses. No logo, no imagery, no fonts (see above).

---

# Rules worth restating

1. **Money is never one number.** `Balance`, `Available` and `Held` are three values plus a
   computed floor. `BalanceTiles` takes a whole account and cannot be asked for one figure.
2. **Decimals come from the currency.** Never a hard-coded 2. JPY has none; BHD has three.
3. **`Math.round` is banned.** Amounts are decimal money — parse and validate as strings.
4. **The sign is a character.** `+` and U+2212, never a hyphen, never colour alone.
5. **Group balances are never summed across currencies**, and the UI says so where a total
   would otherwise sit.
6. **`availableBalance` and `openedOn` do not sort**, and the statement does not sort at all.
7. **The idempotency key is minted on mount**, not on submit, and survives a failed submit.
8. **Refused actions are disabled and explained, never hidden.** A missing button is
   indistinguishable from a bug.
9. **A pill is a badge, never a button.**
10. **No decorative imagery.** If a screen feels empty, it is a layout problem.
