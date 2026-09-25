# Manual verification

These steps need a real Microsoft Entra ID tenant with a directory administrator's consent
already granted for `accounts.write`, `postings.write` and `postings.reverse` — the automated
suites run against a stand-in sign-in server and never exercise consent or a real directory
token (see [console.md](console.md)). Nothing here is automated; the repository owner
runs these steps before a release, not the team on every change.

Before starting, fill `CONSOLE_ENTRA_TENANT_ID` and `CONSOLE_ENTRA_CLIENT_ID` in `.env` (copied
from `.env.sample`) with a registration that has that consent granted, then `docker compose up`.

## Sign in with Microsoft Entra ID

1. Open the console at `http://localhost:${CONSOLE_PORT:-3000}` while signed out.
   You should see: an immediate redirect to `/signin` — no screen data before you are signed in.

2. Start sign-in from `/signin`.
   You should see: Microsoft's own sign-in page for your tenant, not a page the console drew.

3. Sign in with a directory account that carries the granted scopes.
   You should see: a redirect back to `/`, the Overview screen, with your name in the account
   menu at the top right.

4. Open the account menu.
   You should see: your name, sign-in email, "Microsoft Entra ID" as the provider, the tenant,
   your directory object ID, and the scopes on the token — `accounts.write`, `postings.write` and
   `postings.reverse` shown as granted, not as a permission you're missing.

## Record and reverse a posting with a real directory token

5. From Overview's search, open an account (2 characters or more finds it) to its detail screen.
   You should see: the account's balance, available balance and held amount.

6. Record a posting against it: pick a direction and amount, then confirm.
   You should see: a confirmation step restating the direction, amount, currency and account
   before anything is sent, then the new posting on the account and its balance moved by the
   amount.

7. Reverse the posting you just recorded, giving a reason.
   You should see: a prompt for the reason (500 characters or fewer); after confirming, the
   original posting marked reversed with that reason, and a new opposing posting recorded against
   the same account.

8. Reread the account's balance and its postings list.
   You should see: the balance back to where it started before step 6, and the statement showing
   the original posting marked reversed alongside the new opposing posting.

## Sign out

9. Open the account menu and choose "Sign out".
   You should see: a redirect off the console and the account menu gone — nothing on screen still
   names you as signed in.

10. Open the console's address again without signing in again.
    You should see: the same redirect to `/signin` as step 1 — no session left over from the one
    you just ended.
