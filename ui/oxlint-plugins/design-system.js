/**
 * A local oxlint JS plugin (alpha feature — https://oxc.rs/docs/guide/usage/linter/js-plugins.html)
 * standing in for `Design/_adherence.oxlintrc.json`'s `no-restricted-syntax` rules, which oxlint
 * 1.85 does not implement (it has no generic esquery-selector rule) — confirmed by running
 * `oxlint --rules` and by oxlint refusing the rule name outright. Design's own config also carries
 * a non-standard `x-omelette` field oxlint's strict schema rejects outright, so it cannot be loaded
 * via `extends` either. This plugin reproduces the same checks (never edits Design's file) so
 * `ui/.oxlintrc.json` still runs real, working design-system enforcement (DRK-1679 §3 row 10).
 */

/** @type {{ pattern: string; flags?: string; message: string }[]} */
const LITERAL_PATTERNS = [
  { pattern: '#[0-9a-fA-F]{3,8}\\b', message: "Raw hex color — use a design-system color token via var()." },
  { pattern: '\\b\\d+px\\b', message: 'Raw px value — use a design-system spacing token via var().' },
  {
    pattern: "font-family\\s*:\\s*(?!['\"]?(?:Inter|JetBrains Mono))",
    flags: 'i',
    message: 'Font not provided by the design system. Available: Inter, JetBrains Mono.',
  },
];

/**
 * Only the elements whose contract this ticket itself pins are checked here — the console's
 * own new base controls (row 3) and the frame components whose declared prop set row 5-8
 * require to stay unchanged. Design's own richer catalogue (Button, Card, Money, ...) belongs
 * to ledger surfaces not yet rebuilt on shadcn; enforcing it here would false-positive on
 * shadcn's own composition props (e.g. `asChild`) that those elements don't know about yet.
 *
 * DRK-1683 §3 row 19 extends this with the 16 ledger-kit components this slice ships,
 * transcribed from `Design/_adherence.oxlintrc.json`'s `no-restricted-syntax` selectors.
 * @type {Record<string, { props: string[]; literals?: Record<string, string> }>}
 */
const COMPONENT_SHAPES = {
  Id: { props: ['value', 'href', 'onNavigate', 'style'] },
  AppShell: {
    props: ['sidebar', 'breadcrumb', 'topbarRight', 'panel', 'panelOpen', 'panelBehavior', 'children', 'style'],
    literals: { panelBehavior: '^(?:overlay|shift)$' },
  },
  Money: {
    props: ['amount', 'currency', 'decimalPlaces', 'signed', 'showCurrency', 'struck', 'tone', 'align', 'size', 'style'],
    literals: { tone: '^(?:credit|debit)$', align: '^(?:left|right)$', size: '^(?:row|tile)$' },
  },
  StatusBadge: {
    props: ['status', 'tone', 'style'],
    literals: { tone: '^(?:credit|debit|warning|info|neutral)$' },
  },
  LedgerColumn: {
    props: ['key', 'header', 'sortable', 'queryAs', 'align', 'render'],
    literals: { align: '^(?:left|right)$' },
  },
  DetailPanel: {
    props: ['open', 'title', 'children', 'onClose', 'moreHref', 'moreLabel', 'actions', 'footnote', 'style'],
  },
  ScopeGate: { props: ['scope', 'granted', 'reason', 'children', 'style'] },
  IdempotencyKeyField: { props: ['value', 'onRegenerate', 'note', 'style'] },
  MovementLeg: {
    props: ['direction', 'amount', 'currency', 'decimalPlaces', 'accountNumber'],
    literals: { direction: '^(?:Credit|Debit)$' },
  },
  CurrencyBalance: { props: ['currency', 'amount', 'decimalPlaces'] },
  FloorPolicy: { props: ['permittedToGoNegative', 'overdraftLimit', 'minimumBalance', 'currency', 'decimalPlaces'] },
  StatementRowShape: {
    props: ['id', 'effectiveDate', 'recordedAt', 'postingNumber', 'description', 'category', 'signedAmount', 'balanceAfter', 'streamPosition', 'status'],
    literals: { status: '^(?:Posted|Reversed)$' },
  },
  MetadataEntry: { props: ['key', 'value'] },
  DatePreset: { props: ['value', 'label'] },
  SelectOption: { props: ['value', 'label'] },
  Currency: { props: ['code', 'showFlag', 'style'] },
  AccountBalanceShape: { props: ['balance', 'availableBalance', 'heldAmount', 'currency', 'decimalPlaces'] },
  LedgerError: { props: ['code', 'message', 'field'] },
  // DRK-1747 §3 row 17 — the design-kit blocks this slice ships, from `Design/_adherence.oxlintrc.json`
  // and each block's `.d.ts`. Extras beyond the `.d.ts`, each needed by a caller (R3): Chip's
  // role/aria-selected/tabIndex (Tabs renders chips as tabs), Select's aria-label (the pager's
  // `Rows per page`), Dialog's onOpenChange (screens still composing the Radix root, until
  // stage 3) and onCloseAutoFocus (ConfirmMovement's focus return).
  Chip: { props: ['selected', 'onClick', 'children', 'style', 'role', 'aria-selected', 'tabIndex'] },
  Select: { props: ['options', 'value', 'onChange', 'disabled', 'label', 'style', 'aria-label'] },
  Checkbox: { props: ['checked', 'onChange', 'disabled', 'label', 'style'] },
  Switch: { props: ['checked', 'onChange', 'disabled', 'label', 'style'] },
  Textarea: { props: ['value', 'defaultValue', 'placeholder', 'onChange', 'rows', 'readOnly', 'disabled', 'invalid', 'style'] },
  Pagination: {
    props: ['page', 'pageCount', 'pageSize', 'pageSizeOptions', 'onPageChange', 'onPageSizeChange', 'summary', 'position', 'canPrevious', 'canNext', 'style'],
    literals: { position: '^(?:top|bottom)$' },
  },
  Breadcrumb: { props: ['items', 'onNavigate', 'style'] },
  BreadcrumbItem: { props: ['label', 'href', 'id', 'style'] },
  FilterField: { props: ['label', 'hint', 'children', 'style'] },
  TabItem: { props: ['value', 'label'] },
  Dialog: {
    props: ['open', 'title', 'children', 'footer', 'onClose', 'width', 'tone', 'style', 'onOpenChange', 'onCloseAutoFocus'],
    literals: { tone: '^(?:default|destructive)$' },
  },
};

const ALWAYS_ALLOWED_PROPS = new Set(['key', 'ref', 'className', 'children']);

/** @param {unknown} node */
function isStringLiteral(node) {
  return node && node.type === 'Literal' && typeof node.value === 'string';
}

const noRestrictedLiteral = {
  meta: { docs: { description: 'Disallow literal values the design system already tokenises.' } },
  create(context) {
    const matchers = LITERAL_PATTERNS.map((entry) => ({ regex: new RegExp(entry.pattern, entry.flags), message: entry.message }));
    return {
      Literal(node) {
        if (!isStringLiteral(node)) return;
        for (const { regex, message } of matchers) {
          if (regex.test(node.value)) {
            context.report({ node, message: `[design system] ${message}` });
            return;
          }
        }
      },
    };
  },
};

const jsxPropShape = {
  meta: { docs: { description: "Disallow a JSX element carrying a prop its design-system contract doesn't declare." } },
  create(context) {
    return {
      JSXOpeningElement(node) {
        const name = node.name && node.name.type === 'JSXIdentifier' ? node.name.name : null;
        const shape = name ? COMPONENT_SHAPES[name] : undefined;
        if (!shape) return;
        for (const attribute of node.attributes) {
          if (attribute.type !== 'JSXAttribute' || attribute.name.type !== 'JSXIdentifier') continue;
          const propName = attribute.name.name;
          if (ALWAYS_ALLOWED_PROPS.has(propName)) continue;
          if (!shape.props.includes(propName)) {
            context.report({
              node: attribute,
              message: `[design system] <${name}> doesn't accept that prop. Declared props: ${shape.props.join(', ')}.`,
            });
            continue;
          }
          const literalPattern = shape.literals && shape.literals[propName];
          if (literalPattern && attribute.value && attribute.value.type === 'Literal' && typeof attribute.value.value === 'string') {
            if (!new RegExp(literalPattern).test(attribute.value.value)) {
              context.report({
                node: attribute,
                message: `[design system] <${name}> ${propName} must match ${literalPattern}.`,
              });
            }
          }
        }
      },
    };
  },
};

export default {
  meta: { name: 'design-system' },
  rules: {
    'no-restricted-literal': noRestrictedLiteral,
    'jsx-prop-shape': jsxPropShape,
  },
};
