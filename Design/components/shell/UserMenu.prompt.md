# UserMenu

Goes in `AppShell`'s `topbarRight`, right of the search field. One per screen.

```jsx
<AppShell topbarRight={
  <UserMenu
    name="Steven Ho"
    email="steven.ho@transwap.com"
    tenant="Transwap"
    objectId="8f2c41de-90a1-4c33-b0f2-77e5a1c9d412"
    scopes={['accounts.read', 'accounts.write', 'postings.read', 'postings.write']}
    missingScopes={['postings.reverse']}
    onSignOut={signOut}
  />
} />
```

Rules:

- **State the provider.** `Microsoft Entra ID` is written in full, not shortened to
  "SSO" or replaced by an icon. An operator who has been signed out needs to know which
  directory to go back to.
- **Scopes are part of the identity, not a debug detail.** `ScopeGate` keeps refused
  actions on screen and explains them; this menu is where the operator reads which
  scopes they actually hold. A scope the console uses but the token lacks goes in
  `missingScopes` — struck through, with the consequence stated underneath.
- **No avatar image.** Initials on `--muted`. There is no image asset in this system
  and a photo from the directory is not one either.
- No nested menus, and no settings or theme controls here — the menu is identity and
  sign-out only.
