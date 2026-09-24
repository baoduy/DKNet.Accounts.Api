# Overview — insights

The console home. Search first, then the ledger's position. Nothing on this screen is
computed client-side over a listing: `pageSize` caps at 1000, so a count or a sum taken
that way is silently wrong above that.

## Regions

1. **Search** — autofocused, full width, same behaviour as `⌘K`. The caption under the
   field states the route the typed value will take: a UUID resolves account → group →
   posting; `ACME-000123` becomes `filter=AccountNumber:Equal:`; anything else searches
   accounts and groups together. Below two characters nothing is sent, and the field says
   so — the API's `search` has a two-character minimum and would answer `400`.
2. **Position by currency** — one row per currency carrying a balance. Each row shows
   Balance, Available and Held, with a bar showing the available/held split. The bar is
   scaled to its own row's balance, so the split compares within a currency and never
   across rows. There is no total, and the note says why.
   Source: `GET /v1/account-groups/{id}/balances`.
3. **Accounts by status** — donut plus legend, hover to thicken a segment. Blocked on one
   API addition: `MapGetStatusCounts<Account>` exists in the codebase but is mapped to no
   route. Counts shown are illustrative and labelled as such.
4. **Account groups** — status split in the head, type distribution as bars scaled to the
   largest type. `type` and `status` are both queryable, so each bar is a real filter.
5. **Recently viewed** — last 10, held in `localStorage`, ids resolved on render.
6. **Not charted, and why** — posting volume over time (no list route), accounts opened
   per month (`openedOn` is computed, so `orderBy` is a `400`), and one headline total
   (no rate source). Stated on the screen rather than left as a gap someone fills with a
   wrong number later.

## What the first version would need to go live

| Insight | Needs |
|---|---|
| Accounts by status, groups by status | `group.MapGetStatusCounts<Account>("status", …)` mapped for accounts and groups |
| Position by currency, ledger-wide | A per-currency aggregate above group scope, or N group-balance reads |
| Posting volume | `GET /v1/postings` or a postings-count route |

## Files

`index.html` — entry · `Overview.jsx` — the screen.
