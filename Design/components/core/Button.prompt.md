The console's button — use for every control that acts, including links that behave like buttons (pass `href`).

```jsx
<Button variant="primary" onClick={review}>Review movement</Button>
<Button icon={<Icon name="file-text" />} href="/statement">View statement</Button>
<Button variant="primary" disabled>Record posting</Button>
```

Variants: `default` (bordered, card ground) · `primary` (solid lime, one per screen, reserved for the action that records or creates) · `ghost` · `destructive`. Sizes `sm | md | lg`, `md` default at 13px/600 and 6px 12px padding.

**Disabled is a real state, not an absence.** When the service would refuse an action, render the button disabled and put the reason and the refusal code beside it — see `ScopeGate` and the panel footnote pattern. Never a pill: `radius-full` is reserved for badges.
