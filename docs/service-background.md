# Service background and decisions

Business scope and decisions preserved from the earlier README. These record intent; the code and current feature pages define runtime behavior.

## ✨ Why use it?

- **You stop writing bookkeeping.** Balances, stream positions, idempotency and corrections are the
  service's problem, not yours. You record what happened; you read back a balance that provably equals
  the signed sum of what you recorded.
- **A retry is free.** Every posting write is keyed by your own `Idempotency-Key`, scoped to your
  credential — a repeat returns the original outcome instead of double-posting, and the same key used by
  another calling system never collides with yours.
- **Nothing in the ledger is ever erased.** A recorded posting is never altered or removed. A mistake is
  corrected by writing an opposing posting, so the original and the correction both stay readable and
  attributable. The service's one delete route is on an account group, and only while it holds no account.
- **Two systems can be reconciled.** Every system integrating here agrees on what a posting is, what a
  balance means, and how a stream is ordered — which is the thing per-system bookkeeping can never give
  you.
- **Nobody gets to lie about who they are.** The calling system stamped on every posting comes from the
  credential, never from the request body.

## 🧱 Where it fits

This service is **the book of record** for the balances it holds — not a mirror of an upstream core
banking ledger. Downstream systems (payments, wallets, settlement, billing) perform their own business
and then record the *result* here.

It deliberately does **not** own:

- **Payments and settlement** — you move the money; you record here that it moved.
- **KYC and customer onboarding** — a group's `ownerId` points at your customer record; this service
  does not hold one.
- **Interest, fees and currency conversion** — permanently out of scope. You compute them and record
  the resulting posting.

### Decisions on record

Confirmed by drunkcoding on 2026-09-14:

- Postings are recorded **one per account movement**, with an optional identifier grouping the legs of
  one logical transaction. This leaves a schema-compatible path to enforced double-entry later.
- This service is the **book of record** for the balances it holds, not a mirror of an upstream ledger.
- **One currency per account.** A multi-currency holding is several accounts in one group.
- **Negative balances are refused by default**, permitted per account by an explicit overdraft limit or
  an explicit opt-in.
- **Held funds are out of the first delivery** — the fields exist, the behaviour does not.
- **Machine-to-machine credentials only**, authorised per operation class.
- **Postings are retained online indefinitely**; there is no archival in this delivery.
- Designed for **fewer than one hundred postings per second**.
- **Any caller authorised to reverse may reverse**, with no time window, because both the original and
  the reversal remain readable.

Derived by the product owner on 2026-09-14 to close gaps the confirmed set left. These are **derived,
not confirmed by drunkcoding, and remain open to correction:**

- **The most restrictive floor wins** where more than one floor control is set on an account.
- **Permitting an account to go negative without an overdraft limit is refused** at configuration, so no
  account is ever left without a determinate floor.
- **A reversal is exempt from the account's floor but not from the account's status.**
- **An effective date may be backdated but never future-dated.**


## ❓ Open questions

| Question | Why it matters | Checked | Who can answer |
|---|---|---|---|
| Does the historical throughput design target still apply? | Capacity planning needs a current measured target. | Earlier README records fewer than 100 postings per second; no benchmark or service objective is in this repo. | Service owner |
| What online posting retention policy applies in deployed environments? | Recovery and storage planning need a policy. | No archival job is wired in this repo; the earlier README records an indefinite-retention intent. | Service owner |
