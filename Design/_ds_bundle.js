/* @ds-bundle: {"format":4,"namespace":"DKNetAccountsDesignSystem_97519d","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Breadcrumb","sourcePath":"components/core/Breadcrumb.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"CardBar","sourcePath":"components/core/Card.jsx"},{"name":"Chip","sourcePath":"components/core/Chip.jsx"},{"name":"ICON_PATHS","sourcePath":"components/core/Icon.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"Label","sourcePath":"components/core/Label.jsx"},{"name":"Caption","sourcePath":"components/core/Label.jsx"},{"name":"Note","sourcePath":"components/core/Label.jsx"},{"name":"Mono","sourcePath":"components/core/Label.jsx"},{"name":"Pagination","sourcePath":"components/core/Pagination.jsx"},{"name":"Separator","sourcePath":"components/core/Separator.jsx"},{"name":"Skeleton","sourcePath":"components/core/Skeleton.jsx"},{"name":"Tabs","sourcePath":"components/core/Tabs.jsx"},{"name":"ConfirmMovement","sourcePath":"components/feedback/ConfirmMovement.jsx"},{"name":"DetailPanel","sourcePath":"components/feedback/DetailPanel.jsx"},{"name":"DetailList","sourcePath":"components/feedback/DetailPanel.jsx"},{"name":"DetailSection","sourcePath":"components/feedback/DetailPanel.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"RefusalAlert","sourcePath":"components/feedback/RefusalAlert.jsx"},{"name":"ScopeGate","sourcePath":"components/feedback/ScopeGate.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"DateRangeFilter","sourcePath":"components/forms/DateRangeFilter.jsx"},{"name":"FilterField","sourcePath":"components/forms/FilterMenu.jsx"},{"name":"FilterMenu","sourcePath":"components/forms/FilterMenu.jsx"},{"name":"IdempotencyKeyField","sourcePath":"components/forms/IdempotencyKeyField.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"ReadOnlyField","sourcePath":"components/forms/Input.jsx"},{"name":"MetadataEditor","sourcePath":"components/forms/MetadataEditor.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"},{"name":"AccountNumber","sourcePath":"components/ledger/AccountNumber.jsx"},{"name":"PostingNumber","sourcePath":"components/ledger/AccountNumber.jsx"},{"name":"BalanceTiles","sourcePath":"components/ledger/BalanceTiles.jsx"},{"name":"CURRENCY_COUNTRY","sourcePath":"components/ledger/Currency.jsx"},{"name":"Currency","sourcePath":"components/ledger/Currency.jsx"},{"name":"CurrencyBalanceList","sourcePath":"components/ledger/CurrencyBalanceList.jsx"},{"name":"FloorLine","sourcePath":"components/ledger/FloorLine.jsx"},{"name":"LedgerTable","sourcePath":"components/ledger/LedgerTable.jsx"},{"name":"Money","sourcePath":"components/ledger/Money.jsx"},{"name":"StatementTable","sourcePath":"components/ledger/StatementTable.jsx"},{"name":"STATUS_TONE","sourcePath":"components/ledger/StatusBadge.jsx"},{"name":"StatusBadge","sourcePath":"components/ledger/StatusBadge.jsx"},{"name":"AppShell","sourcePath":"components/shell/AppShell.jsx"},{"name":"PageHeader","sourcePath":"components/shell/PageHeader.jsx"},{"name":"CONSOLE_NAV","sourcePath":"components/shell/Sidebar.jsx"},{"name":"BRAND_MARK","sourcePath":"components/shell/Sidebar.jsx"},{"name":"Sidebar","sourcePath":"components/shell/Sidebar.jsx"},{"name":"UserMenu","sourcePath":"components/shell/UserMenu.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"c63a3628ca93","components/core/Breadcrumb.jsx":"74783fd7c6ba","components/core/Button.jsx":"4cf51f9d6f25","components/core/Card.jsx":"a3b132eece84","components/core/Chip.jsx":"27ce99af09f6","components/core/Icon.jsx":"aa2826a90b87","components/core/Label.jsx":"568972d5464f","components/core/Pagination.jsx":"1b9baab07b81","components/core/Separator.jsx":"4d1d6eee0bed","components/core/Skeleton.jsx":"fd7d0a261345","components/core/Tabs.jsx":"7702ff747ffd","components/feedback/ConfirmMovement.jsx":"42fae25fc1e4","components/feedback/DetailPanel.jsx":"f2ca8c2c9b4e","components/feedback/Dialog.jsx":"ed84026fddbe","components/feedback/RefusalAlert.jsx":"a883dc6eda95","components/feedback/ScopeGate.jsx":"5b7c99b2ea90","components/forms/Checkbox.jsx":"7b153817b948","components/forms/DateRangeFilter.jsx":"be86c838ffb2","components/forms/FilterMenu.jsx":"e60ae8796e7c","components/forms/IdempotencyKeyField.jsx":"6008fd7e1bf2","components/forms/Input.jsx":"37691fd4ea9e","components/forms/MetadataEditor.jsx":"254cd0f46fb3","components/forms/Select.jsx":"17cfd4dacac7","components/forms/Switch.jsx":"2788c0a3bab7","components/forms/Textarea.jsx":"620eb4fd4f04","components/ledger/AccountNumber.jsx":"4e91c853f4ea","components/ledger/BalanceTiles.jsx":"c22b870e5016","components/ledger/Currency.jsx":"ffb7dafec398","components/ledger/CurrencyBalanceList.jsx":"0cb39991f00b","components/ledger/FloorLine.jsx":"370579c4faba","components/ledger/LedgerTable.jsx":"ac5d0ba44c08","components/ledger/Money.jsx":"83aaa8911ec7","components/ledger/StatementTable.jsx":"1ee81137eaa6","components/ledger/StatusBadge.jsx":"cbadfc7c8bb4","components/shell/AppShell.jsx":"327e56fd5104","components/shell/PageHeader.jsx":"a1454b5b7ace","components/shell/Sidebar.jsx":"5c4aad9bdcb5","components/shell/UserMenu.jsx":"224b07547a62","ui_kits/account-detail/AccountDetail.jsx":"2c37f8e156bb","ui_kits/account-groups-crud/AccountGroups.jsx":"4bd688baa608","ui_kits/accounts-crud/Accounts.jsx":"357c4212fed9","ui_kits/currencies-crud/Currencies.jsx":"2956130f85d5","ui_kits/overview/Overview.jsx":"5964312938ce","ui_kits/records-crud/Records.jsx":"ac72e9e3d380"},"inlinedExternals":[],"unexposedExports":[{"name":"computeFloor","sourcePath":"components/ledger/FloorLine.jsx"},{"name":"formatAmount","sourcePath":"components/ledger/Money.jsx"}]} */

(() => {

const __ds_ns = (window.DKNetAccountsDesignSystem_97519d = window.DKNetAccountsDesignSystem_97519d || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const badgeBase = {
  display: 'inline-block',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-caption-size)',
  lineHeight: 'var(--text-caption-leading)',
  fontWeight: 'var(--weight-medium)',
  padding: '2px 8px',
  borderRadius: 'var(--radius-full)',
  whiteSpace: 'nowrap'
};
const badgeTones = {
  credit: {
    background: 'var(--badge-credit-bg)',
    color: 'var(--badge-credit-fg)'
  },
  debit: {
    background: 'var(--badge-debit-bg)',
    color: 'var(--badge-debit-fg)'
  },
  warning: {
    background: 'var(--badge-warning-bg)',
    color: 'var(--badge-warning-fg)'
  },
  info: {
    background: 'var(--badge-info-bg)',
    color: 'var(--badge-info-fg)'
  },
  neutral: {
    background: 'var(--badge-neutral-bg)',
    color: 'var(--badge-neutral-fg)'
  }
};
function Badge({
  tone = 'neutral',
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      ...badgeBase,
      ...badgeTones[tone],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Breadcrumb.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Breadcrumb({
  items = [],
  onNavigate,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("nav", _extends({
    "aria-label": "Breadcrumb",
    style: {
      fontSize: 'var(--text-table-size)',
      color: 'var(--muted-foreground)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      ...style
    }
  }, rest), items.map((it, i) => {
    const last = i === items.length - 1;
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: it.label + i
    }, i > 0 ? /*#__PURE__*/React.createElement("span", {
      style: {
        padding: '0 6px'
      }
    }, "/") : null, last || !it.href && !onNavigate ? /*#__PURE__*/React.createElement("b", {
      style: {
        color: 'var(--foreground)',
        fontWeight: 'var(--weight-semibold)'
      }
    }, it.label) : /*#__PURE__*/React.createElement("a", {
      href: it.href || '#',
      style: {
        color: 'var(--link)'
      },
      onClick: onNavigate ? e => {
        e.preventDefault();
        onNavigate(it);
      } : undefined
    }, it.label));
  }));
}
Object.assign(__ds_scope, { Breadcrumb });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Breadcrumb.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const buttonBase = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-table-size)',
  fontWeight: 'var(--weight-semibold)',
  lineHeight: 'var(--text-table-leading)',
  padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-control)',
  background: 'var(--card)',
  color: 'var(--foreground)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  textDecoration: 'none',
  transition: 'background .12s ease, border-color .12s ease, color .12s ease'
};
const buttonVariants = {
  default: {},
  primary: {
    background: 'var(--primary)',
    borderColor: 'var(--primary)',
    color: 'var(--primary-foreground)'
  },
  ghost: {
    background: 'transparent',
    borderColor: 'transparent',
    color: 'var(--foreground)'
  },
  destructive: {
    background: 'var(--destructive-solid)',
    borderColor: 'var(--destructive-solid)',
    color: 'var(--destructive-foreground)'
  }
};
const buttonSizes = {
  sm: {
    padding: 'var(--space-1) var(--space-3)',
    fontSize: 'var(--text-caption-size)'
  },
  md: {},
  lg: {
    padding: 'var(--space-3) var(--space-4)',
    fontSize: 'var(--text-body-size)'
  }
};
function Button({
  variant = 'default',
  size = 'md',
  disabled = false,
  href,
  icon,
  children,
  style,
  onClick,
  type = 'button',
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const hoverStyle = disabled ? null : variant === 'primary' ? {
    background: 'var(--primary-hover)',
    borderColor: 'var(--primary-hover)'
  } : variant === 'destructive' ? {
    background: 'var(--destructive-hover)',
    borderColor: 'var(--destructive-hover)'
  } : {
    background: 'var(--surface-hover)'
  };
  const s = {
    ...buttonBase,
    ...buttonVariants[variant],
    ...buttonSizes[size],
    ...(hover ? hoverStyle : null),
    ...(disabled ? {
      background: 'var(--surface-disabled)',
      borderColor: 'var(--border)',
      color: 'var(--text-disabled)',
      cursor: 'not-allowed'
    } : null),
    ...style
  };
  const handlers = {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false)
  };
  const body = /*#__PURE__*/React.createElement(React.Fragment, null, icon, children);
  if (href && !disabled) {
    return /*#__PURE__*/React.createElement("a", _extends({
      href: href,
      style: s,
      onClick: onClick
    }, handlers, rest), body);
  }
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    style: s,
    disabled: disabled,
    "aria-disabled": disabled || undefined,
    onClick: disabled ? undefined : onClick
  }, handlers, rest), body);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const cardBase = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-card)',
  // Clip children to the radius. A table with nowrap cells inside a shrunk grid
  // track would otherwise paint straight through the border and the rounded corner.
  overflow: 'hidden'
};
function Card({
  padded = true,
  overlay = false,
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      ...cardBase,
      ...(padded ? {
        padding: 'var(--card-padding)'
      } : null),
      ...(overlay ? {
        boxShadow: 'var(--shadow-overlay)'
      } : null),
      ...style
    }
  }, rest), children);
}

/** A bordered strip inside an unpadded Card — the filter bar above a table, or a footer below one. */
function CardBar({
  position = 'top',
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      // Horizontal inset matches --cell-padding-x so the bar lines up with the
      // column grid of the table it sits above or below.
      padding: 'var(--space-3) var(--cell-padding-x)',
      borderBottom: position === 'top' ? '1px solid var(--border)' : undefined,
      borderTop: position === 'bottom' ? '1px solid var(--border)' : undefined,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card, CardBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Chip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const chipBase = {
  display: 'inline-block',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-label-size)',
  lineHeight: 'var(--text-label-leading)',
  padding: '2px 8px',
  borderRadius: 'var(--radius-full)',
  background: 'var(--muted)',
  color: 'var(--muted-foreground)',
  whiteSpace: 'nowrap'
};
const chipSelected = {
  background: 'var(--surface-selected)',
  color: 'var(--foreground)',
  fontWeight: 'var(--weight-semibold)'
};
function Chip({
  selected = false,
  onClick,
  children,
  style,
  ...rest
}) {
  const interactive = typeof onClick === 'function';
  const [hover, setHover] = React.useState(false);
  const hoverStyle = !interactive || !hover ? null : selected ? {
    background: 'var(--surface-selected-hover)'
  } : {
    background: 'var(--surface-hover)',
    color: 'var(--foreground)'
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    role: interactive ? 'button' : undefined,
    tabIndex: interactive ? 0 : undefined,
    onClick: onClick,
    onKeyDown: interactive ? e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick(e);
      }
    } : undefined,
    onMouseEnter: interactive ? () => setHover(true) : undefined,
    onMouseLeave: interactive ? () => setHover(false) : undefined,
    style: {
      ...chipBase,
      ...(selected ? chipSelected : null),
      ...(interactive ? {
        cursor: 'pointer',
        transition: 'background .12s ease'
      } : null),
      ...hoverStyle,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Chip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Chip.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const ICON_PATHS = {
  "layout-dashboard": "<rect width=\"7\" height=\"9\" x=\"3\" y=\"3\" rx=\"1\"/><rect width=\"7\" height=\"5\" x=\"14\" y=\"3\" rx=\"1\"/><rect width=\"7\" height=\"9\" x=\"14\" y=\"12\" rx=\"1\"/><rect width=\"7\" height=\"5\" x=\"3\" y=\"16\" rx=\"1\"/>",
  "folder": "<path d=\"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z\"/>",
  "wallet": "<path d=\"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1\"/><path d=\"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4\"/>",
  "arrow-left-right": "<path d=\"M8 3 4 7l4 4\"/><path d=\"M4 7h16\"/><path d=\"m16 21 4-4-4-4\"/><path d=\"M20 17H4\"/>",
  "coins": "<circle cx=\"8\" cy=\"8\" r=\"6\"/><path d=\"M18.09 10.37A6 6 0 1 1 10.34 18\"/><path d=\"M7 6h1v4\"/><path d=\"m16.71 13.88.7.71-2.82 2.82\"/>",
  "file-text": "<path d=\"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z\"/><path d=\"M14 2v4a2 2 0 0 0 2 2h4\"/><path d=\"M10 9H8\"/><path d=\"M16 13H8\"/><path d=\"M16 17H8\"/>",
  "search": "<circle cx=\"11\" cy=\"11\" r=\"8\"/><path d=\"m21 21-4.3-4.3\"/>",
  "chevron-down": "<path d=\"m6 9 6 6 6-6\"/>",
  "chevron-right": "<path d=\"m9 18 6-6-6-6\"/>",
  "chevron-left": "<path d=\"m15 18-6-6 6-6\"/>",
  "chevrons-left": "<path d=\"m11 17-5-5 5-5\"/><path d=\"m18 17-5-5 5-5\"/>",
  "chevrons-right": "<path d=\"m6 17 5-5-5-5\"/><path d=\"m13 17 5-5-5-5\"/>",
  "x": "<path d=\"M18 6 6 18\"/><path d=\"m6 6 12 12\"/>",
  "copy": "<rect width=\"14\" height=\"14\" x=\"8\" y=\"8\" rx=\"2\" ry=\"2\"/><path d=\"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2\"/>",
  "check": "<path d=\"M20 6 9 17l-5-5\"/>",
  "triangle-alert": "<path d=\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3\"/><path d=\"M12 9v4\"/><path d=\"M12 17h.01\"/>",
  "plus": "<path d=\"M5 12h14\"/><path d=\"M12 5v14\"/>",
  "arrow-right": "<path d=\"M5 12h14\"/><path d=\"m12 5 7 7-7 7\"/>",
  "info": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 16v-4\"/><path d=\"M12 8h.01\"/>",
  "rotate-ccw": "<path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\"/><path d=\"M3 3v5h5\"/>",
  "filter": "<path d=\"M22 3H2l8 9.46V19l4 2v-8.54z\"/>",
  "pencil": "<path d=\"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z\"/><path d=\"m15 5 4 4\"/>",
  "lock": "<rect width=\"18\" height=\"11\" x=\"3\" y=\"11\" rx=\"2\" ry=\"2\"/><path d=\"M7 11V7a5 5 0 0 1 10 0v4\"/>",
  "calendar": "<path d=\"M8 2v4\"/><path d=\"M16 2v4\"/><rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\"/><path d=\"M3 10h18\"/>",
  "download": "<path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"/><path d=\"m7 10 5 5 5-5\"/><path d=\"M12 15V3\"/>",
  "snowflake": "<path d=\"m10 20-1.25-2.5L6 18\"/><path d=\"M10 4 8.75 6.5 6 6\"/><path d=\"m14 20 1.25-2.5L18 18\"/><path d=\"m14 4 1.25 2.5L18 6\"/><path d=\"m17 21-3-6h-4\"/><path d=\"m17 3-3 6 1.5 3\"/><path d=\"M2 12h6.5L10 9\"/><path d=\"m20 10-1.5 2 1.5 2\"/><path d=\"M22 12h-6.5L14 15\"/><path d=\"m4 10 1.5 2L4 14\"/><path d=\"m7 21 3-6-1.5-3\"/><path d=\"m7 3 3 6h4\"/>"
};

/* Lucide, 1.5 stroke. 16px in nav and inline, 20px beside a page title. */
function Icon({
  name,
  size = 16,
  strokeWidth = 1.5,
  style,
  ...rest
}) {
  const d = ICON_PATHS[name];
  if (!d) return null;
  return /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 24 24",
    width: size,
    height: size,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    focusable: "false",
    style: {
      flex: 'none',
      display: 'block',
      ...style
    },
    dangerouslySetInnerHTML: {
      __html: d
    }
  }, rest));
}
Object.assign(__ds_scope, { ICON_PATHS, Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/Label.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** The 11px tracked all-caps label above a tile value or a panel section. */
function Label({
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-label-size)',
      lineHeight: 'var(--text-label-leading)',
      fontWeight: 'var(--weight-semibold)',
      letterSpacing: 'var(--tracking-label)',
      color: 'var(--muted-foreground)',
      textTransform: 'uppercase',
      ...style
    }
  }, rest), children);
}

/** 12px secondary prose — field captions, timestamps, row sub-text. */
function Caption({
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      fontSize: 'var(--text-caption-size)',
      lineHeight: 'var(--text-caption-leading)',
      color: 'var(--muted-foreground)',
      ...style
    }
  }, rest), children);
}

/** The explanatory paragraph that sits under a card and says why something is the way it is. */
function Note({
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      fontSize: 'var(--text-caption-size)',
      lineHeight: 'var(--text-caption-leading)',
      color: 'var(--muted-foreground)',
      textWrap: 'pretty',
      ...style
    }
  }, rest), children);
}

/** Identifier type: JetBrains Mono at table size. */
function Mono({
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      fontFamily: 'var(--font-mono)',
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Label, Caption, Note, Mono });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Label.jsx", error: String((e && e.message) || e) }); }

// components/core/Separator.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Separator({
  orientation = 'horizontal',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "separator",
    "aria-orientation": orientation,
    style: orientation === 'vertical' ? {
      width: 1,
      alignSelf: 'stretch',
      background: 'var(--border)',
      ...style
    } : {
      height: 1,
      width: '100%',
      background: 'var(--border)',
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Separator });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Separator.jsx", error: String((e && e.message) || e) }); }

// components/core/Skeleton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Skeleton({
  width = '100%',
  height = 32,
  radius = 'var(--radius-sm)',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    "aria-hidden": "true",
    style: {
      width,
      height,
      background: 'var(--muted)',
      borderRadius: radius,
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Skeleton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Skeleton.jsx", error: String((e && e.message) || e) }); }

// components/core/Tabs.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Tabs({
  items = [],
  value,
  onChange,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "tablist",
    style: {
      display: 'flex',
      gap: 'var(--space-2)',
      alignItems: 'center',
      ...style
    }
  }, rest), items.map(it => {
    const v = typeof it === 'string' ? it : it.value;
    const label = typeof it === 'string' ? it : it.label;
    return /*#__PURE__*/React.createElement(__ds_scope.Chip, {
      key: v,
      selected: v === value,
      role: "tab",
      "aria-selected": v === value,
      onClick: () => onChange && onChange(v)
    }, label);
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/feedback/DetailPanel.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * The right-hand panel a row opens. Not a modal: it slides in over the right edge of
 * the page, the page behind it is not dimmed or blocked, and clicking a second row
 * swaps the content without closing — the point is comparing records.
 */
function DetailPanel({
  open = false,
  title,
  children,
  onClose,
  moreHref,
  moreLabel = 'Open full page',
  actions,
  footnote,
  style,
  ...rest
}) {
  React.useEffect(() => {
    if (!open || !onClose) return undefined;
    const h = e => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);
  const hasFooter = Boolean(actions || moreHref);
  return /*#__PURE__*/React.createElement("aside", _extends({
    role: "complementary",
    "aria-hidden": !open,
    "aria-label": "Details",
    style: {
      position: 'absolute',
      top: 0,
      right: 0,
      height: '100%',
      width: 'var(--drawer-width)',
      maxWidth: '92%',
      background: 'var(--card)',
      borderLeft: '1px solid var(--border)',
      boxShadow: 'var(--shadow-overlay)',
      zIndex: 50,
      transform: open ? 'none' : 'translateX(100%)',
      transition: 'transform var(--duration-panel) var(--easing-panel)',
      display: 'flex',
      flexDirection: 'column',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: 'var(--space-3) var(--space-4)',
      borderBottom: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: 'var(--text-panel-title-size)',
      lineHeight: 'var(--text-panel-title-leading)',
      fontWeight: 'var(--weight-bold)'
    }
  }, title), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: "sm",
    variant: "ghost",
    onClick: onClose,
    "aria-label": "Close details",
    style: {
      marginLeft: 'auto',
      color: 'var(--muted-foreground)',
      fontSize: 'var(--text-caption-size)'
    }
  }, "Esc ", /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 13
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--card-padding)',
      overflow: 'auto',
      flex: 1
    }
  }, children), hasFooter ? /*#__PURE__*/React.createElement("footer", {
    style: {
      padding: 'var(--space-3) var(--space-4)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      background: 'var(--background)'
    }
  }, footnote ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-caption-size)',
      lineHeight: 'var(--text-caption-leading)',
      color: 'var(--muted-foreground)'
    }
  }, footnote) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 'var(--space-2)',
      flexWrap: 'wrap'
    }
  }, moreHref ? /*#__PURE__*/React.createElement("a", {
    href: moreHref,
    style: {
      marginRight: 'auto',
      color: 'var(--link)',
      fontSize: 'var(--text-table-size)',
      fontWeight: 'var(--weight-semibold)'
    }
  }, moreLabel, " \u2192") : null, actions)) : null);
}

/** The panel's key/value grid. */
function DetailList({
  items = [],
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("dl", _extends({
    style: {
      display: 'grid',
      gridTemplateColumns: '132px minmax(0, 1fr)',
      gap: 'var(--space-2) var(--space-4)',
      fontSize: 'var(--text-table-size)',
      lineHeight: 'var(--text-table-leading)',
      margin: 0,
      ...style
    }
  }, rest), items.map((it, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, /*#__PURE__*/React.createElement("dt", {
    style: {
      margin: 0,
      color: 'var(--muted-foreground)'
    }
  }, it.label), /*#__PURE__*/React.createElement("dd", {
    style: {
      margin: 0
    }
  }, it.value))));
}

/**
 * The 11px tracked heading between groups of panel fields. A rule above it separates it
 * from the group before; pass divider={false} on the first section in a panel, where
 * there is nothing above it to divide from.
 */
function DetailSection({
  children,
  divider = true,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("h4", _extends({
    style: {
      margin: '18px 0 8px',
      fontSize: 'var(--text-label-size)',
      lineHeight: 'var(--text-label-leading)',
      fontWeight: 'var(--weight-semibold)',
      letterSpacing: 'var(--tracking-label)',
      color: 'var(--muted-foreground)',
      textTransform: 'uppercase',
      ...(divider ? {
        borderTop: '1px solid var(--border)',
        marginTop: 'var(--space-5)',
        paddingTop: 'var(--space-4)'
      } : null),
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { DetailPanel, DetailList, DetailSection });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/DetailPanel.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Dialog({
  open = true,
  title,
  children,
  footer,
  onClose,
  width = 520,
  tone,
  style,
  ...rest
}) {
  React.useEffect(() => {
    if (!open || !onClose) return undefined;
    const h = e => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    role: "presentation",
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 60,
      display: 'grid',
      placeItems: 'center',
      background: 'var(--scrim)',
      padding: 'var(--space-6)'
    }
  }, /*#__PURE__*/React.createElement("div", _extends({
    role: "dialog",
    "aria-modal": "true",
    "aria-label": typeof title === 'string' ? title : undefined,
    onClick: e => e.stopPropagation(),
    style: {
      width,
      maxWidth: '100%',
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-xl)',
      boxShadow: 'var(--shadow-overlay)',
      padding: 'var(--space-6)',
      ...style
    }
  }, rest), title ? /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: 'var(--text-section-size)',
      lineHeight: 'var(--text-section-leading)',
      fontWeight: 'var(--weight-semibold)',
      color: tone === 'destructive' ? 'var(--destructive-solid)' : 'var(--foreground)'
    }
  }, title) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: title ? 'var(--space-3)' : 0,
      fontSize: 'var(--text-body-size)',
      lineHeight: 'var(--text-section-leading)'
    }
  }, children), footer !== undefined ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-2)',
      marginTop: 'var(--space-4)'
    }
  }, footer) : onClose ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-2)',
      marginTop: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    onClick: onClose
  }, "Close")) : null));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/RefusalAlert.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Renders the API's errors[] array. Field-scoped errors belong inline on their field;
 * everything else renders here as a block. The code is always shown — support quotes it.
 */
function RefusalAlert({
  errors = [],
  traceId,
  retry,
  style,
  ...rest
}) {
  if (!errors.length && !traceId) return null;
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "alert",
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      padding: 'var(--space-3)',
      border: '1px solid var(--destructive)',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--card)',
      color: 'var(--foreground)',
      fontSize: 'var(--text-table-size)',
      lineHeight: 'var(--text-body-leading)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "triangle-alert",
    size: 16,
    style: {
      color: 'var(--destructive)',
      marginTop: 2
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, errors.map((e, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      marginTop: i ? 6 : 0
    }
  }, e.message, e.code ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-caption-size)',
      color: 'var(--muted-foreground)',
      marginLeft: 6
    }
  }, e.code) : null)), traceId ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      fontSize: 'var(--text-caption-size)',
      color: 'var(--muted-foreground)'
    }
  }, "Trace ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)'
    }
  }, traceId), " \u2014 quote this when reporting.") : null, retry ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, retry) : null));
}
Object.assign(__ds_scope, { RefusalAlert });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/RefusalAlert.jsx", error: String((e && e.message) || e) }); }

// components/feedback/ScopeGate.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Disables children and states the required scope. Hiding an action the user cannot
 * perform is a courtesy; refusing it server-side is the control. A missing button is
 * indistinguishable from a bug, so this disables rather than hides.
 */
function ScopeGate({
  scope,
  granted = false,
  reason,
  children,
  style,
  ...rest
}) {
  if (granted) return /*#__PURE__*/React.createElement(React.Fragment, null, children);
  // Pass `disabled` down rather than fading a wrapper: the child then uses the
  // disabled tokens and its label stays readable, which is the whole point of
  // showing a refused action instead of hiding it.
  const refused = React.Children.map(children, child => React.isValidElement(child) ? React.cloneElement(child, {
    disabled: true
  }) : child);
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    "aria-disabled": "true"
  }, refused), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-caption-size)',
      color: 'var(--muted-foreground)',
      whiteSpace: 'nowrap'
    }
  }, reason || /*#__PURE__*/React.createElement(React.Fragment, null, "requires ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)'
    }
  }, scope))));
}
Object.assign(__ds_scope, { ScopeGate });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/ScopeGate.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Checkbox({
  checked = false,
  onChange,
  disabled = false,
  label,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      fontSize: 'var(--text-table-size)',
      color: disabled ? 'var(--text-disabled)' : 'var(--foreground)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    checked: checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      position: 'absolute',
      opacity: 0,
      width: 1,
      height: 1
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 16,
      height: 16,
      flex: 'none',
      display: 'grid',
      placeItems: 'center',
      border: '1px solid ' + (disabled ? 'var(--border)' : checked ? 'var(--primary)' : 'var(--border-control)'),
      borderRadius: 'var(--radius-xs)',
      background: disabled ? 'var(--surface-disabled)' : checked ? 'var(--primary)' : 'var(--card)',
      color: disabled ? 'var(--text-disabled)' : 'var(--primary-foreground)'
    }
  }, checked ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 12,
    strokeWidth: 2.5
  }) : null), label);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/DateRangeFilter.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const DEFAULT_PRESETS = [{
  value: '7d',
  label: '7d'
}, {
  value: '30d',
  label: '30d'
}, {
  value: '90d',
  label: '90d'
}, {
  value: 'month',
  label: 'This month'
}, {
  value: 'all',
  label: 'All'
}];
function DateRangeFilter({
  from,
  to,
  preset,
  presets = DEFAULT_PRESETS,
  onPreset,
  onOpenPicker,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      flexWrap: 'wrap',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    role: onOpenPicker ? 'button' : undefined,
    tabIndex: onOpenPicker ? 0 : undefined,
    onClick: onOpenPicker,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      border: '1px solid var(--border-control)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-2) var(--space-3)',
      fontSize: 'var(--text-table-size)',
      background: 'var(--card)',
      color: 'var(--foreground)',
      cursor: onOpenPicker ? 'pointer' : 'default',
      whiteSpace: 'nowrap'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "calendar",
    size: 14,
    style: {
      color: 'var(--muted-foreground)'
    }
  }), from, " \u2192 ", to, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 14,
    style: {
      color: 'var(--muted-foreground)'
    }
  })), presets.map(p => /*#__PURE__*/React.createElement(__ds_scope.Chip, {
    key: p.value,
    selected: p.value === preset,
    onClick: () => onPreset && onPreset(p.value)
  }, p.label)));
}
Object.assign(__ds_scope, { DateRangeFilter });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/DateRangeFilter.jsx", error: String((e && e.message) || e) }); }

// components/forms/FilterMenu.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** One labelled row inside the filter panel. */
function FilterField({
  label,
  hint,
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'grid',
      gap: 'var(--space-2)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Caption, null, label), children, hint ? /*#__PURE__*/React.createElement(__ds_scope.Caption, null, hint) : null);
}

/**
 * The single filter control for a table: one button at the right of the card bar that opens
 * a panel holding every filter. Replaces a row of inline selects, which crowds the bar and
 * pushes the search field off the left edge.
 */
function FilterMenu({
  activeCount = 0,
  onClear,
  label = 'Filter',
  children,
  style,
  ...rest
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return undefined;
    const onDown = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = e => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return /*#__PURE__*/React.createElement("div", _extends({
    ref: ref,
    style: {
      position: 'relative',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    onClick: () => setOpen(v => !v),
    icon: /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: "filter",
      size: 14
    }),
    "aria-expanded": open,
    "aria-haspopup": "true",
    style: open ? {
      background: 'var(--surface-selected)'
    } : null
  }, label, activeCount > 0 ? /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 18,
      height: 18,
      padding: '0 5px',
      borderRadius: 'var(--radius-full)',
      background: 'var(--primary)',
      color: 'var(--primary-foreground)',
      fontSize: 11,
      fontWeight: 'var(--weight-semibold)',
      lineHeight: '18px',
      textAlign: 'center',
      fontVariantNumeric: 'tabular-nums'
    }
  }, activeCount) : null, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 14,
    style: {
      color: 'var(--muted-foreground)'
    }
  })), open ? /*#__PURE__*/React.createElement("div", {
    role: "group",
    "aria-label": label,
    style: {
      position: 'absolute',
      top: 'calc(100% + 6px)',
      right: 0,
      zIndex: 40,
      width: 272,
      background: 'var(--popover)',
      color: 'var(--popover-foreground)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-overlay)',
      padding: 'var(--card-padding)',
      display: 'grid',
      gap: 'var(--space-4)'
    }
  }, children, onClear ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      borderTop: '1px solid var(--border)',
      paddingTop: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Caption, null, activeCount > 0 ? activeCount + ' filter' + (activeCount === 1 ? '' : 's') + ' applied' : 'No filters applied'), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: "sm",
    variant: "ghost",
    disabled: activeCount === 0,
    onClick: onClear,
    style: {
      marginLeft: 'auto'
    }
  }, "Clear all")) : null) : null);
}
Object.assign(__ds_scope, { FilterField, FilterMenu });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/FilterMenu.jsx", error: String((e && e.message) || e) }); }

// components/forms/IdempotencyKeyField.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function IdempotencyKeyField({
  value,
  onRegenerate,
  note,
  style,
  ...rest
}) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: style
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Label, null, "Idempotency"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      marginTop: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement("code", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-caption-size)',
      color: 'var(--muted-foreground)',
      wordBreak: 'break-all',
      flex: 1
    }
  }, value), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: "sm",
    variant: "ghost",
    onClick: copy,
    "aria-label": "Copy key"
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: copied ? 'check' : 'copy',
    size: 14
  })), onRegenerate ? /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: "sm",
    variant: "ghost",
    onClick: onRegenerate,
    "aria-label": "Regenerate key"
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "rotate-ccw",
    size: 14
  })) : null), /*#__PURE__*/React.createElement(__ds_scope.Note, {
    style: {
      marginTop: 'var(--space-3)'
    }
  }, note || 'Minted when this form opened, sent as the Idempotency-Key header, and regenerated only after a success. A double-click replays the first request and answers 200, not 201.'));
}
Object.assign(__ds_scope, { IdempotencyKeyField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/IdempotencyKeyField.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const fieldBase = {
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--text-table-size)',
  lineHeight: 'var(--text-table-leading)',
  padding: 'var(--space-2) var(--space-3)',
  border: '1px solid var(--border-control)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--card)',
  color: 'var(--foreground)',
  width: '100%'
};
function Input({
  value,
  defaultValue,
  placeholder,
  onChange,
  type = 'text',
  readOnly = false,
  disabled = false,
  invalid = false,
  mono = false,
  numeric = false,
  prefix,
  style,
  ...rest
}) {
  const control = /*#__PURE__*/React.createElement("input", _extends({
    type: type,
    value: value,
    defaultValue: defaultValue,
    placeholder: placeholder,
    onChange: onChange,
    readOnly: readOnly,
    disabled: disabled,
    "aria-invalid": invalid || undefined,
    style: {
      ...fieldBase,
      ...(mono ? {
        fontFamily: 'var(--font-mono)'
      } : null),
      ...(numeric ? {
        fontVariantNumeric: 'tabular-nums',
        textAlign: 'right'
      } : null),
      ...(readOnly || disabled ? {
        background: 'var(--muted)',
        color: 'var(--muted-foreground)'
      } : null),
      ...(invalid ? {
        borderColor: 'var(--destructive)'
      } : null),
      ...(prefix ? {
        border: 0,
        padding: 0,
        background: 'transparent',
        flex: 1,
        minWidth: 0
      } : null),
      ...style
    }
  }, rest));
  if (!prefix) return control;
  return /*#__PURE__*/React.createElement("span", {
    "data-field-shell": "",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      ...fieldBase,
      padding: 'var(--space-2) var(--space-3)',
      ...(invalid ? {
        borderColor: 'var(--destructive)'
      } : null),
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--muted-foreground)',
      display: 'flex'
    }
  }, prefix), control);
}

/** A non-editable value rendered in the field shell — the locked currency on Record posting. */
function ReadOnlyField({
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      ...fieldBase,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      background: 'var(--muted)',
      color: 'var(--muted-foreground)',
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Input, ReadOnlyField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/MetadataEditor.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function MetadataEditor({
  entries = [],
  onChange,
  readOnly = false,
  style,
  ...rest
}) {
  const update = (i, part) => {
    if (!onChange) return;
    const next = entries.map((e, j) => j === i ? {
      ...e,
      ...part
    } : e);
    onChange(next);
  };
  const add = () => onChange && onChange([...entries, {
    key: '',
    value: ''
  }]);
  const remove = i => onChange && onChange(entries.filter((_, j) => j !== i));
  if (readOnly) {
    return /*#__PURE__*/React.createElement("div", _extends({
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-caption-size)',
        color: 'var(--muted-foreground)',
        ...style
      }
    }, rest), entries.length === 0 ? /*#__PURE__*/React.createElement(__ds_scope.Caption, null, "No metadata.") : entries.map(e => e.key + '=' + e.value).join(' · '));
  }
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      ...style
    }
  }, rest), entries.map((e, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      gap: 'var(--space-2)',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Input, {
    mono: true,
    placeholder: "key",
    value: e.key,
    onChange: ev => update(i, {
      key: ev.target.value
    }),
    style: {
      flex: '0 0 160px'
    }
  }), /*#__PURE__*/React.createElement(__ds_scope.Input, {
    mono: true,
    placeholder: "value",
    value: e.value,
    onChange: ev => update(i, {
      value: ev.target.value
    }),
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: "sm",
    variant: "ghost",
    onClick: () => remove(i),
    "aria-label": "Remove"
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 14
  })))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: "sm",
    icon: /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: "plus",
      size: 14
    }),
    onClick: add
  }, "Add pair")));
}
Object.assign(__ds_scope, { MetadataEditor });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/MetadataEditor.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Select({
  options = [],
  value,
  onChange,
  disabled = false,
  label,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", {
    "data-field-shell": "",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      border: '1px solid var(--border-control)',
      borderRadius: 'var(--radius-md)',
      background: disabled ? 'var(--muted)' : 'var(--card)',
      color: disabled ? 'var(--muted-foreground)' : 'var(--foreground)',
      padding: '0 8px 0 10px',
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-table-size)',
      color: 'var(--muted-foreground)',
      whiteSpace: 'nowrap'
    }
  }, label) : null, /*#__PURE__*/React.createElement("select", _extends({
    value: value,
    onChange: onChange,
    disabled: disabled,
    style: {
      appearance: 'none',
      border: 0,
      background: 'transparent',
      color: 'inherit',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-table-size)',
      lineHeight: 'var(--text-table-leading)',
      padding: '7px 0',
      outline: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer'
    }
  }, rest), options.map(o => {
    const v = typeof o === 'string' ? o : o.value;
    const l = typeof o === 'string' ? o : o.label;
    return /*#__PURE__*/React.createElement("option", {
      key: v,
      value: v
    }, l);
  })), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 14,
    style: {
      color: 'var(--muted-foreground)'
    }
  }));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/core/Pagination.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function PagerButton({
  icon,
  label,
  disabled,
  onClick
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClick,
    disabled: disabled,
    "aria-label": label,
    title: label,
    style: {
      width: 30,
      height: 30,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '999px',
      border: '1px solid ' + (disabled ? 'var(--border)' : 'var(--border-control)'),
      background: 'var(--card)',
      color: disabled ? 'var(--muted-foreground)' : 'var(--foreground)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      padding: 0
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 15
  }));
}

/**
 * Built on CardBar rather than repeating its box. The pager and the filter bar are the
 * same strip at opposite ends of a card, so they must share one inset, one vertical
 * rhythm and one hairline — composing guarantees it instead of hoping two files agree.
 *
 * Rows per page on the left, the page position and the four round steppers on the right:
 * first, previous, next, last. Ends disable rather than disappear, so the control keeps
 * its width and the row does not reflow as the user walks the pages.
 */
function Pagination({
  page = 1,
  pageCount = 1,
  pageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
  summary,
  position = 'bottom',
  canPrevious,
  canNext,
  style,
  ...rest
}) {
  const last = Math.max(1, pageCount);
  const current = Math.min(Math.max(1, page), last);
  const prevOk = canPrevious === undefined ? current > 1 : canPrevious;
  const nextOk = canNext === undefined ? current < last : canNext;
  const go = n => {
    if (onPageChange) onPageChange(Math.min(Math.max(1, n), last));
  };
  const caption = {
    fontSize: 'var(--text-caption-size)',
    color: 'var(--muted-foreground)',
    whiteSpace: 'nowrap'
  };
  return /*#__PURE__*/React.createElement(__ds_scope.CardBar, _extends({
    position: position,
    style: style
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: caption
  }, "Rows per page"), /*#__PURE__*/React.createElement(__ds_scope.Select, {
    options: pageSizeOptions.map(n => String(n)),
    value: String(pageSize),
    "aria-label": "Rows per page",
    onChange: e => onPageSizeChange && onPageSizeChange(Number(e.target.value))
  }), summary ? /*#__PURE__*/React.createElement("span", {
    style: {
      ...caption,
      marginLeft: 'var(--space-4)'
    }
  }, summary) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-5)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: caption
  }, "Page ", current, " of ", last), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement(PagerButton, {
    icon: "chevrons-left",
    label: "First page",
    disabled: !prevOk,
    onClick: () => go(1)
  }), /*#__PURE__*/React.createElement(PagerButton, {
    icon: "chevron-left",
    label: "Previous page",
    disabled: !prevOk,
    onClick: () => go(current - 1)
  }), /*#__PURE__*/React.createElement(PagerButton, {
    icon: "chevron-right",
    label: "Next page",
    disabled: !nextOk,
    onClick: () => go(current + 1)
  }), /*#__PURE__*/React.createElement(PagerButton, {
    icon: "chevrons-right",
    label: "Last page",
    disabled: !nextOk,
    onClick: () => go(last)
  }))));
}
Object.assign(__ds_scope, { Pagination });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Pagination.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Switch({
  checked = false,
  onChange,
  disabled = false,
  label,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      fontSize: 'var(--text-table-size)',
      color: disabled ? 'var(--text-disabled)' : 'var(--foreground)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    role: "switch",
    checked: checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      position: 'absolute',
      opacity: 0,
      width: 1,
      height: 1
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      height: 18,
      flex: 'none',
      borderRadius: 'var(--radius-full)',
      background: disabled ? 'var(--surface-disabled)' : checked ? 'var(--primary)' : 'var(--muted)',
      border: '1px solid ' + (disabled ? 'var(--border)' : checked ? 'var(--primary)' : 'var(--border-control)'),
      position: 'relative',
      transition: 'background .12s ease'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 2,
      left: checked ? 15 : 2,
      width: 12,
      height: 12,
      borderRadius: 'var(--radius-full)',
      background: disabled ? 'var(--text-disabled)' : checked ? 'var(--primary-foreground)' : 'var(--card)',
      transition: 'left .12s ease'
    }
  })), label);
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Textarea({
  value,
  defaultValue,
  placeholder,
  onChange,
  rows = 3,
  readOnly = false,
  disabled = false,
  invalid = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("textarea", _extends({
    value: value,
    defaultValue: defaultValue,
    placeholder: placeholder,
    onChange: onChange,
    rows: rows,
    readOnly: readOnly,
    disabled: disabled,
    "aria-invalid": invalid || undefined,
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-table-size)',
      lineHeight: 'var(--text-body-leading)',
      padding: 'var(--space-2) var(--space-3)',
      border: '1px solid ' + (invalid ? 'var(--destructive)' : 'var(--border-control)'),
      borderRadius: 'var(--radius-md)',
      background: readOnly || disabled ? 'var(--muted)' : 'var(--card)',
      color: readOnly || disabled ? 'var(--muted-foreground)' : 'var(--foreground)',
      width: '100%',
      resize: 'vertical',
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/ledger/AccountNumber.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function CopyableId({
  value,
  href,
  onNavigate,
  children,
  style,
  ...rest
}) {
  const [copied, setCopied] = React.useState(false);
  const copy = e => {
    if (href || onNavigate) return;
    e.preventDefault();
    if (navigator.clipboard) navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };
  const s = {
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--text-table-size)',
    color: href || onNavigate ? 'var(--link)' : 'var(--foreground)',
    cursor: 'pointer',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    ...style
  };
  return /*#__PURE__*/React.createElement("a", _extends({
    href: href || '#',
    title: copied ? 'Copied' : value,
    style: s,
    onClick: href || !onNavigate ? onNavigate ? e => {
      e.preventDefault();
      onNavigate(value);
    } : copy : e => {
      e.preventDefault();
      onNavigate(value);
    }
  }, rest), children || value, copied ? ' ✓' : '');
}

/** An account number: monospace, copy-on-click, linked to the account when a target exists. */
function AccountNumber(props) {
  return /*#__PURE__*/React.createElement(CopyableId, props);
}

/** A posting number, optionally followed by its Reversed badge. */
function PostingNumber({
  reversed = false,
  ...props
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(CopyableId, props));
}
Object.assign(__ds_scope, { AccountNumber, PostingNumber });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/ledger/AccountNumber.jsx", error: String((e && e.message) || e) }); }

// components/ledger/Currency.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * ISO 4217 → ISO 3166-1 alpha-2. Codes with no country are intentionally absent:
 * XAU / XAG (gold, silver) and XDR (IMF drawing rights) have none, and EUR maps to
 * a union rather than a country. Those render the code alone in the reserved slot.
 */
const CURRENCY_COUNTRY = {
  SGD: 'SG',
  USD: 'US',
  JPY: 'JP',
  BHD: 'BH',
  GBP: 'GB',
  AUD: 'AU',
  HKD: 'HK',
  MYR: 'MY',
  IDR: 'ID',
  THB: 'TH',
  PHP: 'PH',
  VND: 'VN',
  INR: 'IN',
  CNY: 'CN',
  KRW: 'KR',
  NZD: 'NZ',
  CHF: 'CH',
  CAD: 'CA',
  AED: 'AE',
  SAR: 'SA',
  ZAR: 'ZA',
  BRL: 'BR',
  MXN: 'MX'
};
function flagFor(code) {
  const cc = CURRENCY_COUNTRY[code];
  if (!cc) return null;
  return String.fromCodePoint(...cc.split('').map(c => 0x1f1e6 + c.charCodeAt(0) - 65));
}
function Currency({
  code,
  showFlag = true,
  style,
  ...rest
}) {
  const flag = showFlag ? flagFor(code) : null;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      whiteSpace: 'nowrap',
      fontFamily: 'var(--font-mono)',
      ...style
    }
  }, rest), showFlag ? /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      display: 'inline-block',
      width: 19,
      marginRight: 2,
      fontSize: 14,
      lineHeight: 1,
      verticalAlign: '-1px',
      fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'
    }
  }, flag) : null, code);
}
Object.assign(__ds_scope, { CURRENCY_COUNTRY, Currency });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/ledger/Currency.jsx", error: String((e && e.message) || e) }); }

// components/ledger/LedgerTable.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const thStyle = {
  fontSize: 'var(--text-caption-size)',
  lineHeight: 'var(--text-caption-leading)',
  fontWeight: 'var(--weight-semibold)',
  letterSpacing: 'var(--tracking-table-head)',
  color: 'var(--muted-foreground)',
  textAlign: 'left',
  padding: 'var(--space-2) var(--cell-padding-x)',
  background: 'var(--muted)',
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap'
};
const tdStyle = {
  fontSize: 'var(--text-table-size)',
  lineHeight: 'var(--text-table-leading)',
  padding: 'var(--cell-padding-y) var(--cell-padding-x)',
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap'
};
function LedgerTable({
  columns = [],
  rows = [],
  rowKey = 'id',
  selectedId,
  onSelectRow,
  orderBy,
  desc = false,
  onSort,
  emptyMessage = 'Nothing to show.',
  style,
  ...rest
}) {
  const keyOf = (row, i) => typeof rowKey === 'function' ? rowKey(row) : row[rowKey] != null ? row[rowKey] : i;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: 'auto',
      maxWidth: '100%'
    }
  }, /*#__PURE__*/React.createElement("table", _extends({
    style: {
      width: '100%',
      minWidth: 'max-content',
      borderCollapse: 'collapse',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, columns.map(c => /*#__PURE__*/React.createElement("th", {
    key: c.key,
    scope: "col",
    onClick: c.sortable && onSort ? () => onSort(c.queryAs || c.key) : undefined,
    title: c.sortable === false ? 'Computed on the entity — not sortable' : undefined,
    style: {
      ...thStyle,
      textAlign: c.align === 'right' ? 'right' : 'left',
      cursor: c.sortable && onSort ? 'pointer' : 'default',
      color: c.sortable === false ? 'var(--reversed)' : thStyle.color
    }
  }, c.header, c.sortable ? /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'var(--space-1)',
      color: orderBy === (c.queryAs || c.key) ? 'var(--foreground)' : 'var(--text-disabled)'
    }
  }, orderBy === (c.queryAs || c.key) ? desc ? '↓' : '↑' : '↕') : null)))), /*#__PURE__*/React.createElement("tbody", null, rows.length === 0 ? /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: columns.length,
    style: {
      ...tdStyle,
      color: 'var(--muted-foreground)',
      textAlign: 'center',
      padding: 'var(--space-6) var(--cell-padding-x)'
    }
  }, emptyMessage)) : rows.map((row, i) => {
    const k = keyOf(row, i);
    const picked = selectedId != null && String(selectedId) === String(k);
    return /*#__PURE__*/React.createElement(LedgerRow, {
      key: k,
      picked: picked,
      onSelect: onSelectRow ? () => onSelectRow(row) : undefined
    }, columns.map(c => /*#__PURE__*/React.createElement("td", {
      key: c.key,
      style: {
        ...tdStyle,
        textAlign: c.align === 'right' ? 'right' : 'left',
        borderBottom: i === rows.length - 1 ? 0 : tdStyle.borderBottom
      }
    }, c.render ? c.render(row) : row[c.key])));
  }))));
}
function LedgerRow({
  picked,
  onSelect,
  children
}) {
  const [hover, setHover] = React.useState(false);
  const bg = picked ? 'var(--surface-selected)' : hover && onSelect ? 'var(--muted)' : undefined;
  return /*#__PURE__*/React.createElement("tr", {
    onClick: onSelect ? e => {
      if (!e.target.closest('a')) onSelect();
    } : undefined,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      cursor: onSelect ? 'pointer' : undefined,
      background: bg
    }
  }, React.Children.map(children, child => child && React.cloneElement(child, {
    style: {
      ...child.props.style,
      background: bg
    }
  })));
}
Object.assign(__ds_scope, { LedgerTable });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/ledger/LedgerTable.jsx", error: String((e && e.message) || e) }); }

// components/ledger/Money.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const MINUS = '\u2212'; // U+2212, never a hyphen

/**
 * Formats a decimal amount to the currency's own precision. Never Math.round:
 * amounts are decimal money, so the value is grouped as a string.
 */
function formatAmount(amount, decimalPlaces = 2) {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const abs = Math.abs(n);
  return abs.toLocaleString('en-US', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces
  });
}
function Money({
  amount,
  currency,
  decimalPlaces = 2,
  signed = false,
  showCurrency = false,
  struck = false,
  tone,
  align = 'right',
  size = 'row',
  style,
  ...rest
}) {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  const negative = n < 0;
  const body = formatAmount(n, decimalPlaces);
  const sign = signed ? negative ? MINUS : '+' : negative ? MINUS : '';
  const resolvedTone = tone || (signed ? negative ? 'debit' : 'credit' : null);
  const colour = struck ? 'var(--reversed)' : resolvedTone === 'credit' ? 'var(--credit)' : resolvedTone === 'debit' ? 'var(--debit)' : undefined;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      fontVariantNumeric: 'tabular-nums',
      fontFeatureSettings: '"tnum"',
      fontWeight: 'var(--weight-semibold)',
      fontSize: size === 'tile' ? 'var(--text-tile-amount-size)' : 'var(--text-amount-size)',
      lineHeight: size === 'tile' ? 'var(--text-tile-amount-leading)' : 'var(--text-amount-leading)',
      display: 'inline-block',
      textAlign: align,
      whiteSpace: 'nowrap',
      color: colour,
      textDecoration: struck ? 'line-through' : undefined,
      ...style
    }
  }, rest), sign, body, showCurrency && currency ? ' ' + currency : '');
}
Object.assign(__ds_scope, { formatAmount, Money });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/ledger/Money.jsx", error: String((e && e.message) || e) }); }

// components/feedback/ConfirmMovement.jsx
try { (() => {
/**
 * The restate-in-words dialog used by record, batch and reverse. It restates the
 * movement rather than echoing the form: a number read twice in the same layout is a
 * number read once.
 */
function ConfirmMovement({
  open = true,
  direction,
  amount,
  currency,
  decimalPlaces = 2,
  accountNumber,
  accountName,
  effectiveDate,
  category,
  legs,
  consequence,
  onBack,
  onConfirm,
  confirmLabel = 'Record posting'
}) {
  const mono = {
    fontFamily: 'var(--font-mono)',
    fontWeight: 'var(--weight-bold)'
  };
  return /*#__PURE__*/React.createElement(__ds_scope.Dialog, {
    open: open,
    title: legs ? 'Confirm this batch' : 'Confirm this movement',
    onClose: onBack,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(__ds_scope.Button, {
      onClick: onBack
    }, "Back"), /*#__PURE__*/React.createElement(__ds_scope.Button, {
      variant: "primary",
      style: {
        marginLeft: 'auto'
      },
      onClick: onConfirm
    }, confirmLabel))
  }, legs ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", null, "All-or-nothing: a refusal on any leg leaves the whole batch unrecorded."), /*#__PURE__*/React.createElement("ul", {
    style: {
      margin: '12px 0 0',
      paddingLeft: 18
    }
  }, legs.map((l, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    style: {
      marginTop: i ? 4 : 0
    }
  }, l.direction, " ", /*#__PURE__*/React.createElement("b", {
    style: {
      fontVariantNumeric: 'tabular-nums'
    }
  }, __ds_scope.formatAmount(l.amount, l.decimalPlaces != null ? l.decimalPlaces : decimalPlaces), " ", l.currency), ' ', l.direction === 'Debit' ? 'from' : 'to', " ", /*#__PURE__*/React.createElement("b", {
    style: mono
  }, l.accountNumber))))) : /*#__PURE__*/React.createElement("div", null, direction, " ", /*#__PURE__*/React.createElement("b", {
    style: {
      fontVariantNumeric: 'tabular-nums'
    }
  }, __ds_scope.formatAmount(amount, decimalPlaces), " ", currency), ' ', direction === 'Debit' ? 'from' : 'to', " ", /*#__PURE__*/React.createElement("b", {
    style: mono
  }, accountNumber), accountName ? /*#__PURE__*/React.createElement(React.Fragment, null, " \xB7 ", accountName) : null, ",", /*#__PURE__*/React.createElement("br", null), "effective ", /*#__PURE__*/React.createElement("b", null, effectiveDate), category ? /*#__PURE__*/React.createElement(React.Fragment, null, ", category ", /*#__PURE__*/React.createElement("b", null, category)) : null, "."), consequence ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-3)',
      fontSize: 'var(--text-caption-size)',
      lineHeight: 'var(--text-caption-leading)',
      color: 'var(--muted-foreground)'
    }
  }, consequence) : null);
}
Object.assign(__ds_scope, { ConfirmMovement });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/ConfirmMovement.jsx", error: String((e && e.message) || e) }); }

// components/ledger/BalanceTiles.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Three tiles, never one. Takes the whole account and cannot be asked to render a
 * single value — the component's shape is what stops "just show the balance" creeping back.
 */
function BalanceTiles({
  account,
  layout = 'tiles',
  style,
  ...rest
}) {
  const dp = account.decimalPlaces != null ? account.decimalPlaces : 2;
  const cells = [{
    label: 'Balance',
    value: account.balance
  }, {
    label: 'Available',
    value: account.availableBalance
  }, {
    label: 'Held',
    value: account.heldAmount
  }];
  if (layout === 'inline') {
    return /*#__PURE__*/React.createElement("div", _extends({
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        ...style
      }
    }, rest), cells.map((c, i) => /*#__PURE__*/React.createElement("div", {
      key: c.label,
      style: i === 0 ? null : {
        borderLeft: '1px solid var(--border)',
        paddingLeft: 'var(--space-4)'
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Label, null, c.label), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Money, {
      amount: c.value,
      decimalPlaces: dp,
      align: "left",
      style: {
        fontSize: 18,
        lineHeight: '24px'
      }
    }), i === 0 ? /*#__PURE__*/React.createElement(__ds_scope.Currency, {
      code: account.currency,
      style: {
        fontSize: 'var(--text-caption-size)',
        color: 'var(--muted-foreground)'
      }
    }) : null))));
  }
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      ...style
    }
  }, rest), cells.map(c => /*#__PURE__*/React.createElement(__ds_scope.Card, {
    key: c.label,
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Label, null, c.label), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Money, {
    amount: c.value,
    decimalPlaces: dp,
    size: "tile",
    align: "left"
  })), /*#__PURE__*/React.createElement(__ds_scope.Currency, {
    code: account.currency,
    style: {
      fontSize: 'var(--text-caption-size)',
      color: 'var(--muted-foreground)'
    }
  }))));
}
Object.assign(__ds_scope, { BalanceTiles });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/ledger/BalanceTiles.jsx", error: String((e && e.message) || e) }); }

// components/ledger/CurrencyBalanceList.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function CurrencyBalanceList({
  balances = [],
  emptyMessage = 'No accounts in this group yet.',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: style
  }, rest), balances.length === 0 ? /*#__PURE__*/React.createElement(__ds_scope.Note, null, emptyMessage) : /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse'
    }
  }, /*#__PURE__*/React.createElement("tbody", null, balances.map(b => /*#__PURE__*/React.createElement("tr", {
    key: b.currency
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      fontSize: 'var(--text-table-size)',
      padding: '9px 12px 9px 0',
      borderBottom: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Currency, {
    code: b.currency
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '9px 0',
      borderBottom: '1px solid var(--border)',
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Money, {
    amount: b.amount,
    decimalPlaces: b.decimalPlaces != null ? b.decimalPlaces : 2
  })))))), /*#__PURE__*/React.createElement(__ds_scope.Note, {
    style: {
      marginTop: 'var(--space-3)',
      paddingTop: 'var(--space-3)',
      borderTop: '1px solid var(--border)'
    }
  }, "Balances are reported per currency and are never combined into a single total."));
}
Object.assign(__ds_scope, { CurrencyBalanceList });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/ledger/CurrencyBalanceList.jsx", error: String((e && e.message) || e) }); }

// components/ledger/FloorLine.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const MINUS = '\u2212';

/** Mirrors AccountFloorPolicy. Returns null when the state is one the API refuses. */
function computeFloor({
  permittedToGoNegative,
  overdraftLimit,
  minimumBalance
}) {
  if (!permittedToGoNegative) return minimumBalance != null ? Number(minimumBalance) : 0;
  if (overdraftLimit == null) return null; // OVERDRAFT_LIMIT_REQUIRED
  return -Number(overdraftLimit);
}
function FloorLine({
  account,
  decimalPlaces = 2,
  style,
  ...rest
}) {
  const floor = computeFloor(account);
  const dp = account.decimalPlaces != null ? account.decimalPlaces : decimalPlaces;
  if (floor === null) {
    return /*#__PURE__*/React.createElement(__ds_scope.Note, _extends({
      style: style
    }, rest), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--destructive)'
      }
    }, "Overdraft limit required"), " \u2014 an account permitted to go negative must state its limit. The API refuses this state with", ' ', /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)'
      }
    }, "OVERDRAFT_LIMIT_REQUIRED"), ".");
  }
  const shown = (floor < 0 ? MINUS : '') + __ds_scope.formatAmount(floor, dp) + ' ' + account.currency;
  const because = account.permittedToGoNegative ? 'permitted to go negative, overdraft limit ' + __ds_scope.formatAmount(account.overdraftLimit, dp) : account.minimumBalance != null ? 'minimum balance ' + __ds_scope.formatAmount(account.minimumBalance, dp) : 'not permitted to go negative, no minimum balance set';
  return /*#__PURE__*/React.createElement(__ds_scope.Note, _extends({
    style: style
  }, rest), "Floor ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: 'var(--foreground)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, shown), " \u2014 ", because, ". This is the figure ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)'
    }
  }, "INSUFFICIENT_FUNDS"), " is measured against.");
}
Object.assign(__ds_scope, { computeFloor, FloorLine });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/ledger/FloorLine.jsx", error: String((e && e.message) || e) }); }

// components/ledger/StatusBadge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** The one colour map. Every status in the console resolves here and nowhere else. */
const STATUS_TONE = {
  Active: 'credit',
  Dormant: 'warning',
  Frozen: 'debit',
  Closed: 'neutral',
  Inactive: 'neutral',
  Posted: 'info',
  Reversed: 'neutral'
};
function StatusBadge({
  status,
  tone,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement(__ds_scope.Badge, _extends({
    tone: tone || STATUS_TONE[status] || 'neutral',
    style: style
  }, rest), status);
}
Object.assign(__ds_scope, { STATUS_TONE, StatusBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/ledger/StatusBadge.jsx", error: String((e && e.message) || e) }); }

// components/ledger/StatementTable.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const th = {
  fontSize: 'var(--text-caption-size)',
  lineHeight: 'var(--text-caption-leading)',
  fontWeight: 'var(--weight-semibold)',
  letterSpacing: 'var(--tracking-table-head)',
  color: 'var(--muted-foreground)',
  textAlign: 'left',
  padding: 'var(--space-2) var(--cell-padding-x)',
  background: 'var(--muted)',
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap'
};
const td = {
  fontSize: 'var(--text-table-size)',
  lineHeight: 'var(--text-table-leading)',
  padding: 'var(--cell-padding-y) var(--cell-padding-x)',
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap'
};

/**
 * Not LedgerTable: different paging (pageIndex), different ordering guarantee
 * (stream order, unsortable) and different row semantics (reversal lineage,
 * struck-through amounts).
 */
function StatementTable({
  rows = [],
  decimalPlaces = 2,
  selectedId,
  onSelectRow,
  postingHref,
  emptyMessage = 'No postings recorded on this account.',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: 'auto',
      maxWidth: '100%'
    }
  }, /*#__PURE__*/React.createElement("table", _extends({
    style: {
      width: '100%',
      minWidth: 'max-content',
      borderCollapse: 'collapse',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    style: th
  }, "Effective"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "Recorded"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "Posting no."), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "Description"), /*#__PURE__*/React.createElement("th", {
    style: {
      ...th,
      textAlign: 'right'
    }
  }, "Amount"), /*#__PURE__*/React.createElement("th", {
    style: {
      ...th,
      textAlign: 'right'
    }
  }, "Balance after"), /*#__PURE__*/React.createElement("th", {
    style: {
      ...th,
      textAlign: 'right'
    }
  }, "#"))), /*#__PURE__*/React.createElement("tbody", null, rows.length === 0 ? /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: 7,
    style: {
      ...td,
      color: 'var(--muted-foreground)',
      textAlign: 'center',
      padding: 'var(--space-6) var(--cell-padding-x)'
    }
  }, emptyMessage)) : rows.map((r, i) => /*#__PURE__*/React.createElement(StatementRow, {
    key: r.id || r.postingNumber,
    row: r,
    last: i === rows.length - 1,
    decimalPlaces: decimalPlaces,
    postingHref: postingHref,
    picked: selectedId != null && String(selectedId) === String(r.id || r.postingNumber),
    onSelect: onSelectRow ? () => onSelectRow(r) : undefined
  })))));
}
function StatementRow({
  row,
  last,
  decimalPlaces,
  postingHref,
  picked,
  onSelect
}) {
  const [hover, setHover] = React.useState(false);
  const bg = picked ? 'var(--surface-selected)' : hover && onSelect ? 'var(--muted)' : undefined;
  const cell = {
    ...td,
    background: bg,
    borderBottom: last ? 0 : td.borderBottom
  };
  const reversed = row.status === 'Reversed';
  return /*#__PURE__*/React.createElement("tr", {
    onClick: onSelect ? e => {
      if (!e.target.closest('a')) onSelect();
    } : undefined,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      cursor: onSelect ? 'pointer' : undefined,
      background: bg
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: cell
  }, row.effectiveDate), /*#__PURE__*/React.createElement("td", {
    style: {
      ...cell,
      color: 'var(--muted-foreground)',
      fontSize: 'var(--text-caption-size)'
    }
  }, row.recordedAt), /*#__PURE__*/React.createElement("td", {
    style: cell
  }, /*#__PURE__*/React.createElement(__ds_scope.PostingNumber, {
    value: row.postingNumber,
    href: postingHref ? postingHref(row) : undefined
  }), reversed ? /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 6
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.StatusBadge, {
    status: "Reversed"
  })) : null), /*#__PURE__*/React.createElement("td", {
    style: {
      ...cell,
      whiteSpace: 'normal'
    }
  }, row.description, row.category ? /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 6
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Chip, null, row.category)) : null), /*#__PURE__*/React.createElement("td", {
    style: {
      ...cell,
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Money, {
    amount: row.signedAmount,
    decimalPlaces: decimalPlaces,
    signed: true,
    struck: reversed
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      ...cell,
      textAlign: 'right'
    }
  }, reversed ? /*#__PURE__*/React.createElement(__ds_scope.Caption, null, /*#__PURE__*/React.createElement(__ds_scope.Money, {
    amount: row.balanceAfter,
    decimalPlaces: decimalPlaces,
    style: {
      color: 'var(--muted-foreground)'
    }
  })) : /*#__PURE__*/React.createElement(__ds_scope.Money, {
    amount: row.balanceAfter,
    decimalPlaces: decimalPlaces
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      ...cell,
      textAlign: 'right',
      fontFamily: 'var(--font-mono)',
      color: 'var(--muted-foreground)'
    }
  }, row.streamPosition));
}
Object.assign(__ds_scope, { StatementTable });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/ledger/StatementTable.jsx", error: String((e && e.message) || e) }); }

// components/shell/AppShell.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * The console frame: sidebar, top bar, scrolling body, and a detail-panel slot.
 * The panel slides in over the right edge of the content by default. Pass
 * panelBehavior="shift" for the older behaviour, where the content is pushed left
 * by --drawer-width instead of being covered.
 */
function AppShell({
  sidebar,
  breadcrumb,
  topbarRight,
  panel,
  panelOpen = false,
  panelBehavior = 'overlay',
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      minHeight: '100%',
      position: 'relative',
      overflow: 'hidden',
      background: 'var(--background)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flex: 1,
      minWidth: 0,
      paddingRight: panelOpen && panelBehavior === 'shift' ? 'var(--drawer-width)' : 0,
      transition: 'padding-right var(--duration-panel) var(--easing-panel)'
    }
  }, sidebar, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      height: 'var(--topbar-height)',
      flex: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: '0 var(--page-padding)',
      borderBottom: '1px solid var(--border)',
      background: 'var(--card)'
    }
  }, breadcrumb, /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)'
    }
  }, topbarRight)), /*#__PURE__*/React.createElement("main", {
    style: {
      padding: 'var(--page-padding)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-5)',
      overflowX: 'auto'
    }
  }, children))), panel);
}
Object.assign(__ds_scope, { AppShell });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/shell/AppShell.jsx", error: String((e && e.message) || e) }); }

// components/shell/PageHeader.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function PageHeader({
  icon,
  title,
  meta,
  description,
  actions,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 'var(--space-3)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      fontSize: 'var(--text-page-title-size)',
      lineHeight: 'var(--text-page-title-leading)',
      fontWeight: 'var(--weight-bold)',
      letterSpacing: 'var(--tracking-title)'
    }
  }, icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 20
  }) : null, title), meta ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      marginTop: 'var(--space-2)',
      flexWrap: 'wrap'
    }
  }, meta) : null, description ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-caption-size)',
      color: 'var(--muted-foreground)',
      marginTop: 4
    }
  }, description) : null), actions ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      gap: 'var(--space-3)',
      alignItems: 'center'
    }
  }, actions) : null);
}
Object.assign(__ds_scope, { PageHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/shell/PageHeader.jsx", error: String((e && e.message) || e) }); }

// components/shell/Sidebar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CONSOLE_NAV = [{
  title: 'LEDGER',
  items: [{
    id: 'overview',
    label: 'Overview',
    icon: 'layout-dashboard',
    href: '/'
  }, {
    id: 'groups',
    label: 'Account groups',
    icon: 'folder',
    href: '/groups'
  }, {
    id: 'accounts',
    label: 'Accounts',
    icon: 'wallet',
    href: '/accounts'
  }, {
    id: 'record',
    label: 'Record posting',
    icon: 'arrow-left-right',
    href: '/postings/new'
  }]
}, {
  title: 'ADMINISTRATION',
  pinToBottom: true,
  items: [{
    id: 'currencies',
    label: 'Currencies',
    icon: 'coins',
    href: '/currencies'
  }]
}];
const BRAND_MARK = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABBCAYAAAAuaKGrAAAQAElEQVR4Aex8ebxV0/v/e+0z3Hu7zbM0KhIZMhMpY4YyJR9RfcyhlDFjpSTKnAgfvio0UIZEhUKFIhRFKEmD5rnucM7Zv/d77b3PeG+m1+/lH7v1rPVM61nPetbaa629z745+Pf6RyPw7wD8o+EH/h2AfwfgH47AP9x8zh0Qj8fdciEWd0tLY25xcYm7Y8cud83aDe633y1zp82c5/7v5SnuoEdGub3vesK97IYH3M5X9XfP6Xane1aXvu6ZXW5zO1x6h9vpin7uf3sNcXvfPdwd8sTL7oS3ZrpfLlzirl2/yd29u4i2S90Y24jvyYe/KYvFYrat5b+ucV+b/JF7670j3fMuu9s9oWMvt9XJV7oHtvmv2+L4bu4BJ3R3D2l3uXvMGde67f9zm3t5nwfdoSPGuh9/usBdt2GzW1RcTF9j5ceqHD+zxztnANIVXNdFLBbH9h27sGLlOsz76ju8NvlDPDD8FVx500M4/7J+OO+ye3BZ7wdw5+Bn8fizr2HMq9Px5ruz8N6HX4DO4pPPv8Gnny/CnLkLMWPWl3hr2hy8RJ1Hnh6PG+58Ap2vHEDojzsGP4eJb3+ExT/8jG3bdyEeT0Dtp/vzd3DZ27xlO/1ZhIGPjEGnKwag152P44VXpuDD2V/hm8XL8PMva7BqzXqs+W0DVhN+WbkWS35agblfLrJ9GvbkOHTtORhdrh2EJ56bhPkLfsDWbTuRSMjXv+ZduQMQp1EFYtI7s9DzjsfR+eoBbPg+9L77STzGQE+bORff//gL1m/cgl27ilBSUmoHy2W9BAfOBf+pdD3HVCigiYRrHdbAFhWXYMPmbVjIzo+eMM3a7tJjEK6//VFM//Bz7NpdDPmhep6VP5+rbjF90+TpxQHv3msInh31Jn5a9it413Gg4xzoNLty1JgkQyS7QZ9d9i+GbQz4/K+XYOiTY+1g9L7rcXw2fzFKS0utTrJiFpKymCnIGQAparZoVnS59j70uWs43nn/Mzq8Epu3bkcJG1KnAjPSF4hW6TCLhg3yIwaFeQYVCAVRIBoGwg4guXTVKfXcqIdkyKYCtWrNBkz9YC6uumkYLr1uMKZM/xQ7du6mxp9PGuxlnNUDhr1IW/dj2oy52LJlmx3UTGu+E2IagAnZV5qGFXGZtJNvCn3VoPZnG7pb1KZVyMqy6wdihiRAvTLOyHwwaz5u7DcCn3+1GMUlJRzZBGNFE5QZzuyw4zKgLioXAA1rAoc3c9DhiDCuPCWCW87NQ7/OeRjcJR8PXJqPoV0rYMglBRh0cT7u7pSHGztE0LVNGCe1NNi3rkGVCi4iToID49qOayB0B+0uKsaceQt5VwzH9X0fw4/LVnK2JjwnfyeXjdKSmJ04XXoMxIvj3sXWbdshu8YYFOTnYe+6NVGxsADGGB/glfAuwyIAomUmhgMKuCam2ri8z1BMee9TaDWQD2VWymLmDMB3P/yC2wY+gzVrN9oO0z/OZmCvqsBh+4Rw9hERXHVK1AZzaLc8BrkAd1+Qj2tOi+LcoyM48YAQDm/ioMXeBs0Y4GZ1gf32MmjZwODIpg4DH0bn48Loc1Ye7rs4Dw92zcft5+fjwmMjOLQRUK0QCNErQ0e1/Gj/mf7R5+hx68PQsreby5I6TnGZSR3fxLX+aS4zfQeNxLLlq+3yEAoZNG5QF906n4bnHr4F4/83AK2POsjacG2uFoVkl4A4ApR30UBJaQw//bwSfe4ebvdC+a3BKa9KwGdXA9Qr33h3Ntau28iRTcChtE5VB70YrGHdC9D/wjz0ODWCczjbj2oaQuNaDqoXAlpiIiGAK48NnuopiCoN1xiHd4yWnhBL8aWrJalKoUGjWgbH7eeg64lh9O+cjwEXFXAQHRTmg3eFfHIZwBj3iaW4kfvPFC6HsXhMghxQ8IuKSvDwU+PBUxZ+Yz9c3rHRSBhtj2uF0SPuwgP39ED7k49GlUqFnGSbAM0w6HKV+WDSSuHpIJFHG+ifaA8SbgJbt+/EIyMnoP/Q/8M24lw6PGE5uZPNnzPvG8R4AhE/PwJcd3oU7Q50UKuSQV7EZYBdGIdSQ1AKymxcdBoEakFJ39OkACeovdOa1wNu6pCHe7mMtdnfsTwpKrjasPs9+AImvT2Ld2dc7CRIvnnrDtw55DmMfnUql4ESygyqVa2EO3p3xbMP34oDmzdGhINBAb79fjl+XrEaLg8FHCMlsl2CUlZpyBOwgHU8Sw7vMpTJD90NYyd9gIeeGgcdJDxp2blCmSHRJigjhtyqhS72q2fg0DDoonjG4rC5gXcFpShDiRGSDZZpMytJYSRFBEAyzLupRX3DZSqKbidGUDGfTNk1hhvfZjzIY/DXi5byLg0CAWjNH/HC6xj/+gzoLnB4y9WpVQ2PDuqJq7t1QOVKFWTEgvaXSVM+9jf3lA0rZD8zS1JSESRlctYyKPSSOMKMMTDGcBLH8eL4aRg56i1oQDK1pemB4xWpvISnnIAKOQ5PLgbgMgJ7CQeYW1cCoyrFM5IYlHtpOYCtWb6SJAKHnciLGpxxWAg3nBlF7Sriujboq9ZuwJDHX8aGTVuR4IagTW8Snz1GcbOV/8Zw5lephPtuvxKntT0KWoKMUX22Tv15X34PHTQ00Txn2QMmD5eeQFRQCmddW0hRYIlyM2nwYQ3PjH4LH3w8Hwl/VcmukDMAkUhEYYSyohIXJTGZChqHfxmJfTDkeeAquOwgGUmZJKIlUpluTTIPPK5w2EAZFgaOAZcgg2Obh3Bx6xAqcEAkjvPhcPZnC/HyxPdQzGeJ73/61Z7Lt2zbAV1a3+++qTs6tm+NSDhsbYkv0Cb+ysT3sZVHatFJYFtJ3CLZDBcex8utCjOXUFayWhTKpyefn4St9C014KkaOQNQWJAHqJcAiksNdhbRCpM1GETRluLoUEpFP4njo7Zwqceq/ui5kFxghcxcgpeMlUF5wDTgZTNo0z6pZRgdjwwjGqI5DnIsHseEN2di6c+r8TyfZleuXgeyEQqFcEmnU3HROe0Q5lrmd4W2vHpLOFifzV/EZ4G0htKVpOk1K8yHQFdkOg56LOV0QMal/XT+wh8xig+aJTwaZwhJ5AxAjWqVYYxnMMYNautuhdGjKWAVJdHskFAG2RbJ8vcpT+N3cttPF8b+A5cR4KzDHDSu7UBOazb9/Mtq3P/4GLzBp/U4B0TT4fCD98NVl3ZANBrJaaCUd864N2eA73LsYCUV3CRGhAQTESYhAqI2GZtnZulyLybpHNWIxWIY9/oHWMnXHJl1YfuSwatdqzoUfxnRsrXZu6szdDQkAjVnKBGwsEOgesIDsDIZTAcoVGBupUhdqi3wOTpuSYV1VVSv6ODkg8Oc2aJcKKDvffQFdvJViDEGe9WpgUG3X8FSfZCOb4dFgq9I9OrkTR6zY+wY1cktL8kHgSfPxGRXoN578uzck3q5ZIrVKr5bmr9gicgM0GTKYNStXR3wvUu4PHVsZ/XAA5UC8NL9TpyJgacOWUpqVjzhgnRcdAAGhmhZUvKZJFZBJT8ZhLgpHLNvCHWqgJcn1Z3g8vwd5tLTqWM7tNy/CbQMUSEjFRWXYtwbM6CHNFe+W6lnQ2gKE+WBvBN4VJAHHCMXA6ZferL0XAJpaq/6hC8lRadDzgBoFqkCo4pEwsW6LYl0fQ+3LRgPz8i9mW1Z0kkCESbZtGAzMawmM9+WBl5oUkSEiQoIeqsn5cOacGOFdymWDu+UenvVRPeLzoAOEZ4klSvgerKfPvNz9inojxqijgoB0ewkdgCZsiyn0vqTrS9N+cgbEN98tzTTDKmcAdibHXE40yijWYPVm10k1PvAcnYpRYFaYg2hGSB9y5CCwBJ+lhSSTsN9NKmtHljCRThk0KKBwxK8LBMFPDj06H4uGu5dC4HvFCZTKV8TvM59YsWqdVz7vTpWyHaY1DtL/rlMdgReLWECj8rOXeiNgN4cZ0tyBqBBPXaCM5GJ4XSxigNQxNMQuBwBche5l5vFCugMdX/NzOIh3WZQD7yEK/AQQtomA/lVp7JBPo+kgIGuhvXr4KxTj4ExOd2RmE+8v2HMhKk5T89ebauyx0weWFfK0LKyDL5nNeBbik67jF8xl8EMVRI5Htffqxaq8yREGWcLsJZL0MRPi7CemzFXJLE9UAseBthW4F1pfDXK5dnaAZUMISOe2NOVZkhqhpmARcUCDQBkDeybXfe90xtyrlKeQN6YOhu/rd+SJcuynyUNSKtlM04g1/X7Eki9Um4FQC0yRbFIJhlwkZcXSXICJGcAateshpOPb8WTRpi2DOg/XvsshiGTirBtd1CNZXYbotUORSo0WCv5rmvhChdr2PeiUoCnQD/+UiYwUZ1JNXxgJz2lpJByJclhAx6NGOTxzZ+CH3IcNKpfm8dU+ovca/OWHZjK3wHi5bzAS6+hvUINOLQZCjnczB04bIQpXc1zz+dkeilKACgXwL9ko8HedXwqVTgp1MPUcM8rL0CzJnvTiNdpLqHYtIPHvjhpJk+zjFwtEtSY4vjG3BLcNbYIN7xQhNteKsbYT0qxalPCdoBzKc0AK6VRasKTp/HJlE0FSW9VI4w3WTCOQY3qVWBMmq5vS4eIt6bO4WviVZy5kgt8IQvZSgdjaIt3f+sjW+LCjm1xYYe2OPLQ5qhYsUKafbXKykzCMiGdgt9PKjKF+UR+Jt/CEs1IOQMgqd6b97ryfETyoiItcO/jG8ugAcuymboksESQUY2JT5sJznoXO/g0/ePqOMbOLkW/8SWYtzTB0whrSYkFBDYjwiAwDywBpJmxM+KqAjgrAU5Q6HI4W+vWqUk1IzIJCuz6jZvx3Etv25dzMuOBgaGWgIVN4lfnW9PuF7XHW6MHY+yz/fDIvT3xyMDr8erzA/HKU3fj6MNapE5YnAmyT6dsfZt5rlk0yNSGIOQ4OLRlM3Q4vXUgSpZOEktDdBc0bVQPYc6ugC00qZzWWIAa2y34OUffOmmgiyhPUuCAAL9xUx/+TglmLYkjlpCUEBghGnTK1rQZmUFJVEn2tLcYtlaQnw/tW+KnQ5wPW++8PxcrVq2FXtily1gtaAYKfiP+UDO0/7UYeNtl2HefBsjnxItG+dojGkFhhXwcdfgBGPFAH5x/1gmIcCYjeXmOm4CmYxoYcYla23m0cXq7o/DowJ6oV7dGoJkskzFNcnxEjml2+SQcjoAhWKtqUa1QKBRQ7vo5eBEXS2A9IYtSQ9AqtoEPd7ob1m9zuTRIVhaYDKYow/pixrnBxHiqcElUr1YJdWpWI5aW2OZu/qSpo2dMG0+mKNmm+li3dg0M63ctOpx2HAoLC6B+pqlbNBxyoJNW315dcNABTanjh83A9wi85A1gjOHdaVCBR+NmTerjph4X8U7qiebNGiLMh0VkXb6lLK4laR2emDaTnJT3lsWZZAgerly1VGqGqrYxBoYMAQuLMz5YudHF3B/jnJ3iEqSQDT6bBVSRwwU1pjtH+5KIfRrWRdXKN+RwYQAAEABJREFUhUi/NECz532LL7/5AdoHJFN41K7qiFYZYkC07Bx75IE8dIQ8djm5BqYef0e+5drOaLB3bRvMkONwMAwc9jHkONZGtaqV0a71YRhy99V4ZeQ96HNNJ9SqUcXqoYxLMSqDDa8Cfwegbcq9IKsTJLJSwDWWL0qgeo7j8aDoIXWJG4+5+OyHGF93k2KyA+tFKKVITLZYKF62kClN6hKOgjEGhx+yf86Lt02bt2H4cxOhV8+piqqetMb+OTxo1EPXC0+zS46kvwfhcAinnHgExj/bn7+yXYJzzzgep7Y5Amefdiyu6toBj993A94Z+yBGDb8DXc4/GdpLQ7x79mR3jwPA/rGuogPwrtfkgwIAYam+QLRmZ8AyxsAw+A6tBzwqZSYDrN5isHUXNdIDL1wQaFOswZF9j2Wwg29o9UyTnx9Fq4P3RXontd5/8sUiLFj0k69urMtGlM2EAJFIGJ06tEOt6lVhTJrAE5eZS0ttNW28N667/Dw8OqgXnh52E564vzf63dwNnTqeiKaN60F+Oey8MapRpqkk00liWYhjeHtZA4oAQ8zCxoWl4m/VhVsklRkYEh7Y6qTKTga7+YPPjqJgJ07XYv3ANlFJVBjalg+b7ZHYoGa1KmjSYC8Y+iodQQlHRp+GFJfwwUMMVghMifTAtWu0Xl07nCge74/nqqNf2bRBV+aP+/q8JY8bt9Z4J6vTv2e1/AEIsbvWmLE2dAfwYGFxLwu6FZTkErUzlZ3mkCE4RZFNIZO1xzJI1BPLnhyIe3psjwmCQE9KwsnTd0trtvI3YO7mzZo2QE37DCAhW6SNRT8sx6y5C3nTeNbAuqzm0T5L2gX5efb5Qfg/CeUOQMgJwSEEzultHvtMUt1hoWRRm7H3ZPgo/NLbOUDS7zkDhOTFWZhvUJiXZHg2dHtJ3QdbRTitMIp8nwP8wGcKGAetuXnqtBFYKOLPkyOefx0b+Vux5RnPEVtdDI8k5iPWOMl/MDnlte2EuAQ5vqNUsndAnIgCpGD4nRPHQkrVBlKdpglpWnFmRik735DH4qoVDIwxFAtsVeKU23a80t5VElNvO1+HLPstjqqVK6L9SUfbkwcrIMEZ8s33P+PDTxcQVz1VkMQH1jXgP5biFHGp2rJtJ8jCX7l016rNGE8EAv3oLt6ftVX+ANBRhxAY1NFOgMBj9RHlXw7lIS5jmRpk2sCC724MWvPHdh4sPI6hJoHJQ5inJ44XbwCDZeuALbtDOKn1IXb9dxyvC3rw0q9du3bt9uz5lWUvAJ9lC31QPH9h6phqmX8gS3Am6reFSVNmYeDDo6GPlW/qPwIPPDkWE9/+GPqEcvfuYn8S/L5Bz/sy9EIhByFFx5cp+NoDNBsFPjuzUJTE8Xvs8Bgr0gPW8uPvMET6bffwfUJ8veFJUzkrMwW0UOMPeoxr4LyfShHNr4ALeILRSUYyG5R1mzB52ifQbKR5qIpBcAkTeLTmlb7Vee2tmfaD4z86c+P83XnxkuW4/MZh6HXXE9B3SOPe+AAvT3wfjz4zAT3veAwdu96FfkNfsJ+1ewNR1iHD80O5o6wsCDkhOATJFDfe4Vx/XfVLrCwIOsfS5TIioEbIIc2kDibHhnTtqgb/bRtGtUIS1EtPrOqRilIAHsceWb9fGcO+Teqh1UH7QmIOK4pLSux3/pqZags0y+TXIsbkE7aQLwl26IdlKzF6wnSU9Z7eKqZlsrt0+WrcPOApfPHlYhTzSVs2eFuyw7Df/ZTy1fG6jZvxf+Pexbnd70TfQSOxcNFSxq38QXDS2shAYxxtV4+z5Mp/+osSzkCS6h8Lhko9IYbklKMmk5xyKXOclHltyPrUcf/6Idx6Th4ObhRCyGFlRtH4Fkl5ia8ZrEmPgsSyt2RVAht3Rfnjy3Gozpdnxhjo+nnFb3idS4IrJ8WQayotZBCW41ezd8tzo9+CPv7VbLXCMjLdVYs4828e8DS+WrgEetawamo+MEYnjQVK2OTGzdv5G/RMXNxjIF7lnVYSHIspTk8KQTpt8WKeJkaNn4YNGzYzDpxjDKYaLY4ZK8/I2FgOTac0+Svlx7F3NRct9nbQvlUYfc6O4o7zomi+l8PHd9aiHnO2oVy2BRpO36gtvPb1Sc3Ur0vRuFFDnHtGG96dnusKjr6MWLdevsqOwGUoVAbgEhGwsEntcEqwX+s3bUHfgSMx+LGXsPiH5fYLC31dp4Dpa4vFS37h8vIq9PcKcznztRQnTfitqBsCy/cztRbnmq3vWe99aBS0Z2jZ88XJwutFkmTn6ZR+vR/7+vv2m0ZFR8EsiBie69MUA1R9CXApC6cNFW0PDOPBbhXs3wZc3z6KNi1CqFUJnPmu77q0AnCJBEA0mRQo4MffgCVrw7jgrBNRp1bq5Zt+Z9V3QSW8/YMq2cEI+OmldARydd2GLXxtPRn6c6lrb3sYQzgY+jMmBf2iq+/FQ0+N5+a6CvoiL7Bh2ANDQsCCKYWR8BJZCW7a8vGJ/020f/7kCVJ5zgBo1IeNGIstW7ZRy2UzLhrXBq5rH0GzOlKnVXKRDeqJywHUIEgFAF8IojrXeX1cq/08tSJRgYkquYk2GHLyicgWixLeeTO/jaFWzZo46YTDEZYxaiS45Lz61odYsnQFKS8ZExhmRY/FXDwB0WQSTfD1dSdpD5ny3mcYzmeJkS++jukffo7Vv63nUhWjJ7Qn3QCSdgKE8gBlScs2QkRZF/iVr8X/0FcRP69Yg0W87RIcORmpzHN677Pycex+IeRFgKRVCQXWfNB4UFKNMiZkXCmxZUvugZs0m0KsCq272LAtjq+WJ/jS6zj+/FjHCrQnrN+4FW9Om4OSkhi8uMgaAKgUWFVmLiE7eTyr5VVOKmguwdoAL6uhmUUclutz8Ecuq0uDxdwD9IeO2XU0pTN4+psq/cEZV17Ir+b1DJrUMlxzYWkEl/wPQDzbEqDCgipbSjzjYQZZV7oBeDpI9pXBB/TaecYiF3mFNfnm8vTkm08NwBcLlmA5JwyrMOUYJy89qS3pCNL5sO2Ka4yBMQLwkj5ICwwzmwAQR+qSliDFycZc0CQ75aKouDhbiJwB0HqozgEGxhjUq+4gFBIFGiEoGWV7Ak9BOU0kFUVDmSDJzUQkEgTcFRsS+HCxi3PPbIPgmyVOKB49S+3GpiUz0P3jZdCCSkFWTTWQxsokXSvxcpTRnWx7pKnscCOtVLEQ2VfOABTxfBsoqVKFPBoIGOml2ALx2ICKFPiMQK5SI0EwxhJUVemNqa9NXmbiUz5mLoojEaqIc9ofj1DwXMLj8Xc/rsDMOV9CD0eZtfZAeU2mKQQtSyDwRUkfPVpkmtTemZ6krDywmSnLi0bR8I98FWEMx8S26G2FgOE/pC7ZDyDFJSYmCyXVV5kOEgvIk1jgk+R4A2ERZuIL1vD348+XAqedeCSaN20Ah7OIYuwuKuHT53vYsWOXHjnEKgeMz2epBkURTXWIBJOlVUr+t0BGBCkjdjUhq3atavy9uX5K4GOMto/5RZQ/RvuojQr3N5K0oA6wSDornJJUIsPqsEwxPUzR9DA/93SUB+AL7OySutp9aVYMTl4NXHf5+Xx3pBMAXeJ6sHL1esyY9RV0UPDq0UrQtkrrpCeBaIp9KlX4/EyRKEFKrSws0JCfufIU1wafCsYYnNb2SNSvV4tUZsoZgIr8Ydqq0A4TdhZrO7ac3EwK4gYeCRdPILwssDKbwQYHqmyYB3ccGFiD2d8nMH8ZcMYpx/LW5TnYwF56uPnok69h/wKSg+FZ8nKroEy67LTQ34OMmqq3xwopBWGCjPp2+oib6ovu2n0a7oXLu5zFSRTOsZ4zAHrNaxgOabJ/2M6f/+DT+LuXkQG6LMMCkeIJ6LwKnn6xhT9TvvZpKfILKsD+mVHEc9zQjy3bduC1tz/i0bNUtS24ymVPIDwA4yNSsMDM1wlEbBYWqGp5NiPBtmAB/pUU+HR5BdvwDWoO6LOU7v85wx6fHScn3LmnoBrVKkEVA68UDJkE5EA6AEkW0i6piFQlgfA0XsAS2/fTb8ogQYObdgDD3y3B8vUuOp7eGgfs1wjGeAYS3Hw/mvM1vuMrA1s/maVZ9QOcFGUgtOPbsjVsllJIktKhKizYLKVkmSlS0hSVhtGPEA8N+mPwzue0QyiUG3xp53D1E180GoF8kMJW/mZRGhcm9wQBXm7TUsiEoBq5xqieDyooY7JjsbPIxYRPYvhiqYs6tarj2svOgz68YjWb9MLsnQ/m8jxdYmmHtkIEA2NpL0vHPU6G2Gd5hVr2MOuA0DSWSAsZJtMVMgRWVeu+wBiDli2a4MF+PVCjWmUYk6urCjkDUI3K1YM3jRzFbVyCtnFJSDWbwmQAKMOwWGpQJXipFBClSeZ+ointMFp21mxOYMS0Ury3IEahQYfTjkP99L9VYEW9Pv5iwffcI1zIfMP6tXFJp1NQsUI+6/hJ7bjEs4EsBDLhkltGkvDvRNJWxjI9qW46TVy+s0gmBV6EfNurTnXcc3N36HN/Y8qoLEVCzgBUKqyA/Zo2gDGOPeLt4ia8Sh/UJqhtk4wJAi+D0gr9zMBYTLmABNU8h/2cdCltasmZ91McD08uxazFMRSVuqjAgJ5/Vhv7zodx51k/gbXrN+O5MZPt5qtIhfk+SA9nd/bpaje4wgoFXpuqwOYs4Tedg1sdOiC95NS3RLmZkRGTKU4ng+CHHAf6rHP4/b35m3VLLj2hzEpZVM4ARCIhtGvdCmF/zdLD0BdLY4gl2FzGSJKWUxayrJIM+ijHNMMtMOD8mcF+jrJsnYtXP41h8MRSDHuzBN+uiENtGWNw4jEtcVCLfTgBXC43xfiCrxxuvGc4Jr0zC3ppFnIcHEz5FV3O5O1dBT2vOB89undAhYJ8GCO/GFw5IFCASaqgW36SjkACn2UV0mjVTSetPNDNLWVN63zjhnUxbMB1OP6Yg+23R7mamZycAZD4BFauxmUIskrG7O/jWMrfYuUTSRhjfCBlCLCZEIKHK+BFXE22cA9ZucHFgl8SmL4gjmfej+H2l0tw25hijPmoBIv5C5fuMlb0k8Guojhmz/sGL732Pnrc+gguvuZevP/xfJ58SuDwztyXd+jA269E3do14DgG1apWxI09OuOum7pCf99gjOeD4ifQHWONe4RFkzyfShXpSsSZbOxVppSSmNiCKN9UntLmCIx56i4cf/RBnMB7nvmBgTIHoAnPrYcc2AzGeB3ZuB14bPIuTJlfYgdi5WYDC5sMflkP/LQWWPQr8NmPLqZ+ncCoj0rx0Nsl6De+GLe9XITbXynGfRNL8PR7pZjyZSl+XBPHzqIEZ7ghMBTByNIr3TE651998zDcOfgZvPPBZ9i6bSfX/QQ7Fcah/Cnysft64YhDmtvgs4r1U8e9bp1Px/OP3obDDt6Py1cY1ntGRzZdnqDYEhMZjKhy1YXVsppIXZKKJxBXNIF+MmdtmXHpu2t9qF2jKvr2um6hMRIAAAQFSURBVASP3dcT+iDXccoMqwzlQJmaUT4NX3B2G2hdVY0Ef4pcwVk8cnoMdzCgt4zahVsJt4zejb5jinAnefeML8KQScV48t1iTJhTipnfxPDN8jh+XZ/Axu0J7Nid4As0l+s5nU/QKgc3xNlbqWIB6vLEE4kwYOS57GSMP64o6EX8ZU4/M2pZbFCvNv57cXs89eBNaHWQAhyikVQyxiA/L4ojW+1PnRtx1aVn2Qe4MPcKY7xAynaqxu9hyVBnKZJPH8N8Q6mPbs8+9Vg8NfRG9OjWAbVqVEXIKTOkWTZSZJnaDo2c3u4oXPaf9sjjSyRjDEcb0Bq9dWccm7anYMvOBLbtSnDZcFHMDbSUgyU9vSZwebIHZ5iWjRAdVjCikTAKuFY3aVgPF3Zsi6eH3owJ/xuIK7me12eQC/grjtrMi0SQn5+Hxrwb9RT5ysh+GHTbFZxh9XgnlOk2dIVCDvZpVI8nkG72I9lz27eGPh+MREI2OEZK3hy2GKeDX3oS0F/4F0PNfrvUJkaxMQ7bDqMi3xa0O74V9F/gPHl/H7Q97lDkcfCNoRL+3OWUp65Gbrr2P7y1ukB/wBByqMqRN/D+qZ5RVgbIjwhnXkWeqPQK+ZCWzXD2qcfg+svPwyODeuLN0fdj6viheHxwb5xx8tE4oHkj3Nv3CkyfMAxvjhqMF57oixefvAOTX3oA744dhvtuv4I6jRHNi8CY8lpNOSKVKAfwoBZNMXxIb0x4bgB6X9UJRxzaHFUqF8JhXwxMqkIGxmAHtI+GHMd+h3rsEQegzzUXcsLci+cf64s2xxyCwsJ8GFOeLfzu5exJoyKNX3fZuQzEEDx4Tw+czSdT3f56Om3BJ9QD92+CVi2b4ZjDWuDUtkfgovNOwo3XdLJr4bhnBzCgD2PGpMcwefQQjBx2s/2ku3PHtjiUdfSsodmq9o0xEK5bWPZPPfEInNzmcBzKfahm9co2YPgrF+MSjUa4J+yLW66/GK+9MBDvjhuGR+693t59rbifNKpflxt3FVTnRl6NBw89NO1VpwZ0FNdh5OquHbmv9OWEeYgD2R+3XHcRjuRA2k8iaR9/88oZgFAoZAIIh8MmLy9quDSYKy4924wZcZeZMelRM2fKU+aTKU+b2ZNHmBmvP27eHf+QmfDcvWbk0JtN/1suM90vOsMwgKbFfo0NTyWmYsUCw2XH5OflmWg0aiKRsJHtoJ2gFE8yzl4jEC5eIP+rZSQSYdtRU6liodl/30aG72YMlw/DyWG+nvm8WfLpy2bp5+PMMsJP88aaxbNHm7lTR5rJLw0xQ/v3MOeeeYJp2rieKSysYO3I3l/1K3u8cgYgW+Ff+v9vBP4dgL8Z379b/d8B+LsR/Jv1/x8AAAD//waDBVwAAAAGSURBVAMAldpqVTjx7EgAAAAASUVORK5CYII=';
function Sidebar({
  brand = /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      background: '#ffffff',
      borderRadius: 'var(--radius-md)',
      padding: '5px 7px'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: BRAND_MARK,
    alt: "",
    style: {
      display: 'block',
      height: 24,
      width: 'auto'
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '1.6em'
    }
  }, "Accounts")),
  sections = CONSOLE_NAV,
  active,
  onNavigate,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("nav", _extends({
    style: {
      width: 'var(--sidebar-width)',
      flex: 'none',
      background: 'var(--sidebar)',
      borderRight: '1px solid var(--sidebar-border)',
      padding: 'var(--space-3) var(--space-2)',
      display: 'flex',
      flexDirection: 'column',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-panel-title-size)',
      fontWeight: 'var(--weight-extrabold)',
      letterSpacing: 'var(--tracking-title)',
      padding: '4px 8px 10px'
    }
  }, brand), sections.map(sec => /*#__PURE__*/React.createElement("div", {
    key: sec.title,
    style: sec.pinToBottom ? {
      marginTop: 'auto'
    } : null
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-label-size)',
      fontWeight: 'var(--weight-semibold)',
      letterSpacing: 'var(--tracking-section-label)',
      color: 'var(--muted-foreground)',
      padding: '14px 8px 4px'
    }
  }, sec.title), sec.items.map(it => /*#__PURE__*/React.createElement(NavItem, {
    key: it.id,
    item: it,
    active: active === it.id,
    onNavigate: onNavigate
  })))));
}
function NavItem({
  item,
  active,
  onNavigate
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("a", {
    href: item.href || '#',
    onClick: onNavigate ? e => {
      e.preventDefault();
      onNavigate(item);
    } : undefined,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      padding: 'var(--space-2)',
      borderRadius: 'var(--radius-md)',
      textDecoration: 'none',
      fontSize: 'var(--text-table-size)',
      color: 'var(--foreground)',
      fontWeight: active ? 'var(--weight-semibold)' : 'var(--weight-regular)',
      background: active ? 'var(--surface-selected)' : hover ? 'var(--muted)' : 'transparent'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: item.icon,
    size: 16
  }), item.label);
}
Object.assign(__ds_scope, { CONSOLE_NAV, BRAND_MARK, Sidebar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/shell/Sidebar.jsx", error: String((e && e.message) || e) }); }

// components/shell/UserMenu.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Initials from a display name. Two letters, upper case, no punctuation. */
function initialsOf(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '—';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/**
 * The signed-in identity in the top bar. The console authenticates against
 * Microsoft Entra ID, so the menu states the provider, the tenant and the scopes
 * the token actually carries — a refused action is explained by a missing scope,
 * and this is where the operator checks which ones they hold.
 */
function UserMenu({
  name,
  email,
  tenant,
  provider = 'Microsoft Entra ID',
  scopes = [],
  missingScopes = [],
  objectId,
  onSignOut,
  style,
  ...rest
}) {
  const [open, setOpen] = React.useState(false);
  const [hover, setHover] = React.useState(false);
  const wrap = React.useRef(null);
  React.useEffect(() => {
    if (!open) return undefined;
    const onDoc = e => {
      if (wrap.current && !wrap.current.contains(e.target)) setOpen(false);
    };
    const onKey = e => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return /*#__PURE__*/React.createElement("div", _extends({
    ref: wrap,
    style: {
      position: 'relative',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-haspopup": "menu",
    "aria-expanded": open,
    onClick: () => setOpen(o => !o),
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      padding: '4px var(--space-2) 4px 4px',
      border: 0,
      borderRadius: 'var(--radius-md)',
      background: open || hover ? 'var(--surface-hover)' : 'transparent',
      font: 'inherit',
      fontSize: 'var(--text-table-size)',
      color: 'var(--foreground)',
      cursor: 'pointer',
      maxWidth: 220
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 26,
      height: 26,
      flex: 'none',
      borderRadius: 'var(--radius-md)',
      background: 'var(--muted)',
      color: 'var(--muted-foreground)',
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-label-size)',
      fontWeight: 'var(--weight-semibold)'
    }
  }, initialsOf(name)), /*#__PURE__*/React.createElement("span", {
    style: {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      fontWeight: 'var(--weight-semibold)'
    }
  }, name), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 14,
    style: {
      flex: 'none',
      color: 'var(--muted-foreground)'
    }
  })), open ? /*#__PURE__*/React.createElement("div", {
    role: "menu",
    style: {
      position: 'absolute',
      top: 'calc(100% + 6px)',
      right: 0,
      width: 288,
      zIndex: 40,
      background: 'var(--popover)',
      color: 'var(--popover-foreground)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-overlay)',
      padding: 'var(--card-padding)',
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Label, null, "Signed in"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      fontSize: 'var(--text-table-size)',
      fontWeight: 'var(--weight-semibold)'
    }
  }, name), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(__ds_scope.Caption, null, /*#__PURE__*/React.createElement(__ds_scope.Mono, {
    style: {
      fontSize: 'var(--text-caption-size)'
    }
  }, email))), /*#__PURE__*/React.createElement(__ds_scope.Note, {
    style: {
      marginTop: 6
    }
  }, provider), /*#__PURE__*/React.createElement(__ds_scope.Separator, {
    style: {
      margin: 'var(--space-4) 0'
    }
  }), /*#__PURE__*/React.createElement(__ds_scope.Label, null, "Directory"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'max-content minmax(0, 1fr)',
      gap: '4px var(--space-3)',
      marginTop: 'var(--space-2)',
      fontSize: 'var(--text-caption-size)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Caption, null, "Tenant"), /*#__PURE__*/React.createElement("span", {
    style: {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, tenant || /*#__PURE__*/React.createElement(__ds_scope.Caption, null, "Not stated.")), objectId ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(__ds_scope.Caption, null, "Object ID"), /*#__PURE__*/React.createElement(__ds_scope.Mono, {
    style: {
      fontSize: 'var(--text-caption-size)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, objectId)) : null), /*#__PURE__*/React.createElement(__ds_scope.Separator, {
    style: {
      margin: 'var(--space-4) 0'
    }
  }), /*#__PURE__*/React.createElement(__ds_scope.Label, null, "Scopes on this token"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 'var(--space-2)',
      marginTop: 'var(--space-2)'
    }
  }, scopes.map(s => /*#__PURE__*/React.createElement(__ds_scope.Chip, {
    key: s,
    selected: true
  }, /*#__PURE__*/React.createElement(__ds_scope.Mono, {
    style: {
      fontSize: 'var(--text-label-size)'
    }
  }, s))), missingScopes.map(s => /*#__PURE__*/React.createElement(__ds_scope.Chip, {
    key: s,
    style: {
      background: 'var(--surface-disabled)',
      color: 'var(--text-disabled)',
      textDecoration: 'line-through'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Mono, {
    style: {
      fontSize: 'var(--text-label-size)'
    }
  }, s)))), missingScopes.length ? /*#__PURE__*/React.createElement(__ds_scope.Note, {
    style: {
      marginTop: 'var(--space-2)'
    }
  }, missingScopes.length === 1 ? missingScopes[0] + ' is not granted' : missingScopes.join(', ') + ' are not granted', ". Actions that need it stay on screen, disabled, with the reason beside them.") : null, /*#__PURE__*/React.createElement(__ds_scope.Separator, {
    style: {
      margin: 'var(--space-4) 0'
    }
  }), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    size: "sm",
    icon: /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: "arrow-right",
      size: 14
    }),
    onClick: onSignOut,
    style: {
      width: '100%',
      justifyContent: 'center'
    }
  }, "Sign out")) : null);
}
Object.assign(__ds_scope, { UserMenu });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/shell/UserMenu.jsx", error: String((e && e.message) || e) }); }

// ui_kits/account-detail/AccountDetail.jsx
try { (() => {
const {
  AppShell,
  Sidebar,
  PageHeader,
  UserMenu,
  Card,
  CardBar,
  Pagination,
  LedgerTable,
  Button,
  Icon,
  Chip,
  StatusBadge,
  Badge,
  Label,
  Caption,
  Note,
  Mono,
  Breadcrumb,
  Input,
  Select,
  Textarea,
  Checkbox,
  MetadataEditor,
  IdempotencyKeyField,
  Money,
  Currency,
  BalanceTiles,
  FloorLine,
  AccountNumber,
  DetailPanel,
  DetailList,
  DetailSection,
  Dialog,
  ConfirmMovement,
  RefusalAlert,
  ReadOnlyField,
  FilterMenu,
  FilterField
} = window.DKNetAccountsDesignSystem_97519d;
const NAV = [{
  title: 'LEDGER',
  items: [{
    id: 'overview',
    label: 'Overview',
    icon: 'layout-dashboard',
    href: '../overview/index.html'
  }, {
    id: 'accounts',
    label: 'Accounts',
    icon: 'wallet',
    href: '../accounts-crud/index.html'
  }, {
    id: 'records',
    label: 'Records',
    icon: 'file-text',
    href: '../records-crud/index.html'
  }]
}, {
  title: 'ADMINISTRATION',
  pinToBottom: true,
  items: [{
    id: 'groups',
    label: 'Account groups',
    icon: 'folder',
    href: '../account-groups-crud/index.html'
  }, {
    id: 'currencies',
    label: 'Currencies',
    icon: 'coins',
    href: '../currencies-crud/index.html'
  }]
}];
const CURRENCIES = {
  SGD: 2,
  USD: 2,
  JPY: 0,
  KWD: 3,
  USDC: 6,
  IDR: 0
};
const dec = code => code in CURRENCIES ? CURRENCIES[code] : 2;
const CALLER = 'usr_4f21c8';
const CATEGORIES = ['transfer', 'fee', 'adjustment', 'settlement', 'interest', 'reversal'];
const CLASSIFICATIONS = ['asset', 'liability', 'equity', 'revenue', 'expense'];
const TODAY = '2026-09-22';
const ACCOUNTS = [{
  id: 'a1',
  accountNumber: 'ACME-000123',
  groupId: 'ACME',
  name: 'Operating account',
  currency: 'SGD',
  classification: 'liability',
  status: 'Active',
  balance: 12400,
  heldAmount: 0,
  permittedToGoNegative: false,
  overdraftLimit: null,
  minimumBalance: '0',
  externalReference: 'erp:acme-op-01',
  metadata: [{
    key: 'region',
    value: 'apac'
  }, {
    key: 'tier',
    value: 'enterprise'
  }],
  openedOn: '18 Sep 2026'
}, {
  id: 'a2',
  accountNumber: 'MERCH-000044',
  groupId: 'MERCH',
  name: 'Settlement — APAC',
  currency: 'SGD',
  classification: 'liability',
  status: 'Active',
  balance: -1820.4,
  heldAmount: 0,
  permittedToGoNegative: true,
  overdraftLimit: '50000',
  minimumBalance: null,
  externalReference: null,
  metadata: [{
    key: 'corridor',
    value: 'sg-my'
  }],
  openedOn: '14 Sep 2026'
}, {
  id: 'a3',
  accountNumber: 'SUSP-000002',
  groupId: 'SUSP',
  name: 'Suspense — unmatched',
  currency: 'SGD',
  classification: 'asset',
  status: 'Frozen',
  balance: 1204.55,
  heldAmount: 0,
  permittedToGoNegative: false,
  overdraftLimit: null,
  minimumBalance: null,
  externalReference: null,
  metadata: [],
  openedOn: '12 Sep 2026'
}, {
  id: 'a4',
  accountNumber: 'TREAS-000007',
  groupId: 'TREAS',
  name: 'Treasury — USD nostro',
  currency: 'USD',
  classification: 'asset',
  status: 'Active',
  balance: 984210.06,
  heldAmount: 0,
  permittedToGoNegative: true,
  overdraftLimit: '250000',
  minimumBalance: null,
  externalReference: 'swift:nostro-usd',
  metadata: [{
    key: 'desk',
    value: 'usd'
  }],
  openedOn: '02 Sep 2026'
}, {
  id: 'a5',
  accountNumber: 'ACME-000124',
  groupId: 'ACME',
  name: 'Payroll — JPY',
  currency: 'JPY',
  classification: 'liability',
  status: 'Dormant',
  balance: 4200000,
  heldAmount: 0,
  permittedToGoNegative: false,
  overdraftLimit: null,
  minimumBalance: '100000',
  externalReference: null,
  metadata: [],
  openedOn: '28 Aug 2026'
}, {
  id: 'a6',
  accountNumber: 'FEES-000003',
  groupId: 'FEES',
  name: 'Fee income — cards',
  currency: 'SGD',
  classification: 'revenue',
  status: 'Active',
  balance: 0,
  heldAmount: 0,
  permittedToGoNegative: false,
  overdraftLimit: null,
  minimumBalance: null,
  externalReference: null,
  metadata: [{
    key: 'product',
    value: 'cards'
  }],
  openedOn: '26 Aug 2026'
}];
const SEED = [{
  id: 'r1',
  recordNumber: 'PST-0000918',
  accountId: 'a1',
  direction: 'credit',
  amount: '4200.00',
  currency: 'SGD',
  effectiveDate: '2026-09-21',
  category: 'transfer',
  description: 'Inbound customer transfer, batch 4471.',
  counterpartyAccountId: 'a4',
  counterpartyReference: 'swift:MT103-88213',
  transactionGroupId: 'tgr_88f102',
  externalReference: 'erp:pay-4471',
  metadata: [{
    key: 'channel',
    value: 'swift'
  }],
  recordedBy: 'usr_4f21c8',
  recordedAt: '21 Sep 2026 09:14:22 UTC',
  status: 'Posted',
  reversedBy: null,
  reverses: null
}, {
  id: 'r2',
  recordNumber: 'PST-0000919',
  accountId: 'a1',
  direction: 'debit',
  amount: '18.50',
  currency: 'SGD',
  effectiveDate: '2026-09-21',
  category: 'fee',
  description: 'Transfer fee, batch 4471.',
  counterpartyAccountId: 'a6',
  counterpartyReference: null,
  transactionGroupId: 'tgr_88f102',
  externalReference: null,
  metadata: [],
  recordedBy: 'usr_4f21c8',
  recordedAt: '21 Sep 2026 09:14:22 UTC',
  status: 'Posted',
  reversedBy: null,
  reverses: null
}, {
  id: 'r3',
  recordNumber: 'PST-0000920',
  accountId: 'a2',
  direction: 'debit',
  amount: '1820.40',
  currency: 'SGD',
  effectiveDate: '2026-09-20',
  category: 'settlement',
  description: 'Corridor SG–MY settlement, cycle 208.',
  counterpartyAccountId: null,
  counterpartyReference: 'cycle:208',
  transactionGroupId: null,
  externalReference: null,
  metadata: [{
    key: 'corridor',
    value: 'sg-my'
  }],
  recordedBy: 'svc_settlement',
  recordedAt: '20 Sep 2026 23:05:01 UTC',
  status: 'Posted',
  reversedBy: null,
  reverses: null
}, {
  id: 'r4',
  recordNumber: 'PST-0000921',
  accountId: 'a4',
  direction: 'credit',
  amount: '120000.00',
  currency: 'USD',
  effectiveDate: '2026-09-19',
  category: 'transfer',
  description: null,
  counterpartyAccountId: null,
  counterpartyReference: 'nostro:funding',
  transactionGroupId: null,
  externalReference: 'trs:fund-0912',
  metadata: [],
  recordedBy: 'usr_1b77a0',
  recordedAt: '19 Sep 2026 14:41:08 UTC',
  status: 'Posted',
  reversedBy: null,
  reverses: null
}, {
  id: 'r5',
  recordNumber: 'PST-0000922',
  accountId: 'a1',
  direction: 'debit',
  amount: '950.00',
  currency: 'SGD',
  effectiveDate: '2026-09-18',
  category: 'adjustment',
  description: 'Manual adjustment, later corrected.',
  counterpartyAccountId: null,
  counterpartyReference: null,
  transactionGroupId: null,
  externalReference: null,
  metadata: [],
  recordedBy: 'usr_9a30de',
  recordedAt: '18 Sep 2026 11:02:40 UTC',
  status: 'Reversed',
  reversedBy: 'PST-0000923',
  reverses: null,
  reversalReason: 'Amount applied twice — duplicate of PST-0000918.'
}, {
  id: 'r6',
  recordNumber: 'PST-0000923',
  accountId: 'a1',
  direction: 'credit',
  amount: '950.00',
  currency: 'SGD',
  effectiveDate: '2026-09-18',
  category: 'reversal',
  description: 'Reverses PST-0000922 — amount applied twice.',
  counterpartyAccountId: null,
  counterpartyReference: null,
  transactionGroupId: null,
  externalReference: null,
  metadata: [],
  recordedBy: 'usr_9a30de',
  recordedAt: '18 Sep 2026 11:06:12 UTC',
  status: 'Posted',
  reversedBy: null,
  reverses: 'PST-0000922',
  reversalReason: 'Amount applied twice — duplicate of PST-0000918.'
}, {
  id: 'r7',
  recordNumber: 'PST-0000924',
  accountId: 'a5',
  direction: 'credit',
  amount: '4200000',
  currency: 'JPY',
  effectiveDate: '2026-09-15',
  category: 'transfer',
  description: 'Payroll pre-fund, September cycle.',
  counterpartyAccountId: 'a4',
  counterpartyReference: null,
  transactionGroupId: 'tgr_71aa93',
  externalReference: null,
  metadata: [{
    key: 'cycle',
    value: '2026-09'
  }],
  recordedBy: 'svc_payroll',
  recordedAt: '15 Sep 2026 02:00:07 UTC',
  status: 'Posted',
  reversedBy: null,
  reverses: null
}, {
  id: 'r8',
  recordNumber: 'PST-0000925',
  accountId: 'a6',
  direction: 'credit',
  amount: '18.50',
  currency: 'SGD',
  effectiveDate: '2026-09-14',
  category: 'fee',
  description: 'Fee recognition, batch 4470.',
  counterpartyAccountId: 'a1',
  counterpartyReference: null,
  transactionGroupId: null,
  externalReference: null,
  metadata: [],
  recordedBy: 'svc_billing',
  recordedAt: '14 Sep 2026 09:30:11 UTC',
  status: 'Posted',
  reversedBy: null,
  reverses: null
}, {
  id: 'r9',
  recordNumber: 'PST-0000926',
  accountId: 'a3',
  direction: 'credit',
  amount: '1204.55',
  currency: 'SGD',
  effectiveDate: '2026-09-12',
  category: 'adjustment',
  description: 'Unmatched inbound, held pending attribution.',
  counterpartyAccountId: null,
  counterpartyReference: 'ref:unmatched-88',
  transactionGroupId: null,
  externalReference: null,
  metadata: [],
  recordedBy: 'svc_ingest',
  recordedAt: '12 Sep 2026 17:22:55 UTC',
  status: 'Posted',
  reversedBy: null,
  reverses: null
}];
const PERIODS = [{
  value: '7d',
  label: 'Last 7 days'
}, {
  value: '14d',
  label: 'Last 14 days'
}, {
  value: '30d',
  label: 'Last 30 days'
}, {
  value: '90d',
  label: 'Last 90 days'
}];
const PERIOD_FROM = {
  '7d': '2026-09-15',
  '14d': '2026-09-08',
  '30d': '2026-08-23',
  '90d': '2026-06-24'
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(iso) {
  if (!iso) return '—';
  const p = iso.split('-');
  return p[2].replace(/^0/, '') + ' ' + MONTHS[Number(p[1]) - 1] + ' ' + p[0];
}
const scaleOf = v => (String(v).split('.')[1] || '').length;
const mintKey = () => 'idm_' + Math.random().toString(16).slice(2, 10) + '-' + Math.random().toString(16).slice(2, 6) + '-' + Date.now().toString(16).slice(-6);
function floorOf(a) {
  if (!a) return null;
  if (a.permittedToGoNegative) return a.overdraftLimit === null || a.overdraftLimit === '' ? null : -Number(a.overdraftLimit);
  return a.minimumBalance === null || a.minimumBalance === '' ? 0 : Number(a.minimumBalance);
}
function FormRow({
  label,
  hint,
  required = false,
  children
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Caption, {
    style: {
      paddingTop: 8
    }
  }, label, required ? /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      color: 'var(--destructive-solid)',
      marginLeft: 2
    }
  }, "*") : null), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, children, hint ? /*#__PURE__*/React.createElement(Note, {
    style: {
      marginTop: 6
    }
  }, hint) : null));
}
const requested = new URLSearchParams(location.search).get('account');
const BASE = ACCOUNTS.find(a => a.accountNumber === requested) || ACCOUNTS[0];
function AccountDetailScreen() {
  const [account, setAccount] = React.useState(BASE);
  const [records, setRecords] = React.useState(SEED.filter(r => r.accountId === BASE.id));
  const [selectedId, setSelectedId] = React.useState(null);
  const [mode, setMode] = React.useState(null);
  const [draft, setDraft] = React.useState(null);
  const [errors, setErrors] = React.useState([]);
  const [idemKey, setIdemKey] = React.useState(mintKey);
  const [seq, setSeq] = React.useState(0);
  const [dialog, setDialog] = React.useState(null);
  const [reason, setReason] = React.useState('');
  const [reasonError, setReasonError] = React.useState(false);
  const [flash, setFlash] = React.useState(null);
  const [directionFilter, setDirectionFilter] = React.useState('Any');
  const [categoryFilter, setCategoryFilter] = React.useState('Any');
  const [statusFilter, setStatusFilter] = React.useState('Any');
  const [period, setPeriod] = React.useState('30d');
  const [query, setQuery] = React.useState('');
  const [sort, setSort] = React.useState({
    field: 'recordNumber',
    desc: true
  });
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const errorRef = React.useRef(null);
  React.useEffect(() => {
    if (!errors.length) return;
    let p = errorRef.current && errorRef.current.parentElement;
    while (p && p.scrollHeight <= p.clientHeight) p = p.parentElement;
    if (p) p.scrollTop = p.scrollHeight;
  }, [errors]);
  const dp = dec(account.currency);
  const selected = records.find(r => r.id === selectedId) || null;
  const dirty = draft && mode === 'create' ? Boolean(draft.amount || draft.description || draft.counterpartyAccountId || draft.counterpartyReference || draft.transactionGroupId || draft.externalReference || draft.metadata.length) : false;
  const rows = records.filter(r => (directionFilter === 'Any' || r.direction === directionFilter) && (categoryFilter === 'Any' || r.category === categoryFilter) && (statusFilter === 'Any' || r.status === statusFilter) && r.effectiveDate >= PERIOD_FROM[period] && (query.trim() === '' || [r.recordNumber, r.description || '', r.transactionGroupId || '', r.counterpartyReference || '', r.externalReference || ''].join(' ').toLowerCase().includes(query.trim().toLowerCase()))).sort((a, b) => {
    const dir = sort.desc ? -1 : 1;
    const x = sort.field === 'amount' ? Number(a.amount) : a[sort.field];
    const y = sort.field === 'amount' ? Number(b.amount) : b[sort.field];
    return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y))) * dir;
  });
  React.useEffect(() => {
    setPage(1);
  }, [directionFilter, categoryFilter, statusFilter, period, query]);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount);
  const visible = rows.slice((current - 1) * pageSize, current * pageSize);
  const set = part => setDraft(d => ({
    ...d,
    ...part
  }));
  const closePanel = () => {
    if (mode === 'create' && dirty) {
      setDialog({
        kind: 'discard'
      });
      return;
    }
    setMode(null);
    setDraft(null);
    setErrors([]);
    setSelectedId(null);
  };
  const discard = () => {
    setDialog(null);
    setMode(null);
    setDraft(null);
    setErrors([]);
    setSelectedId(null);
  };
  const openView = r => {
    setSelectedId(r.id);
    setMode('view');
    setDraft(null);
    setErrors([]);
  };
  const openEditAccount = () => {
    setSelectedId(null);
    setDraft({
      name: account.name,
      classification: account.classification,
      permittedToGoNegative: account.permittedToGoNegative,
      overdraftLimit: account.overdraftLimit === null ? '' : String(account.overdraftLimit),
      minimumBalance: account.minimumBalance === null ? '' : String(account.minimumBalance),
      metadata: (account.metadata || []).map(m => ({
        ...m
      }))
    });
    setMode('edit-account');
    setErrors([]);
  };
  const openCreate = () => {
    setSelectedId(null);
    setDraft({
      direction: 'credit',
      amount: '',
      effectiveDate: TODAY,
      category: 'transfer',
      description: null,
      counterpartyAccountId: null,
      counterpartyReference: null,
      transactionGroupId: null,
      externalReference: null,
      metadata: []
    });
    setMode('create');
    setErrors([]);
    setIdemKey(mintKey());
  };
  const applyDelta = (direction, amount) => setAccount(a => ({
    ...a,
    balance: Number(a.balance) + (direction === 'credit' ? Number(amount) : -Number(amount))
  }));
  const validate = () => {
    const found = [];
    const amount = String(draft.amount || '').trim();
    if (account.status === 'Frozen' || account.status === 'Closed') found.push({
      message: account.accountNumber + ' is ' + account.status.toLowerCase() + '. No record can be posted against it.',
      code: 'ACCOUNT_NOT_POSTABLE'
    });else if (account.status === 'Dormant' && draft.direction === 'debit') found.push({
      message: 'Debits are disabled: this account is dormant. A credit can still be recorded.',
      code: 'DEBIT_NOT_PERMITTED'
    });
    if (amount === '') found.push({
      message: 'Amount is required.',
      code: 'AMOUNT_REQUIRED'
    });else if (!/^\d+(\.\d+)?$/.test(amount) || Number(amount) === 0) found.push({
      message: 'Amount takes a positive decimal, written unsigned — the direction carries the sign.',
      code: 'INVALID_AMOUNT'
    });else if (scaleOf(amount) > dp) found.push({
      message: 'Amount carries ' + scaleOf(amount) + ' decimal places; ' + account.currency + ' is stored at ' + dp + '.',
      code: 'AMOUNT_SCALE_EXCEEDS_CURRENCY'
    });
    if (draft.effectiveDate && draft.effectiveDate > TODAY) found.push({
      message: 'Effective date cannot be in the future.',
      code: 'EFFECTIVE_DATE_IN_FUTURE'
    });
    if (draft.direction === 'debit' && /^\d+(\.\d+)?$/.test(amount)) {
      const floor = floorOf(account);
      const after = Number(account.balance) - Number(amount);
      if (floor !== null && after < floor) found.push({
        message: 'This debit would take ' + account.accountNumber + ' to ' + after.toFixed(dp) + ', below its floor of ' + floor.toFixed(dp) + ' ' + account.currency + '.',
        code: 'INSUFFICIENT_FUNDS'
      });
    }
    setErrors(found);
    return found.length === 0;
  };
  const saveAccount = () => {
    const found = [];
    const limit = String(draft.overdraftLimit || '').trim();
    const floorMin = String(draft.minimumBalance || '').trim();
    if (!(draft.name || '').trim()) found.push({
      message: 'Name is required.',
      code: 'ACCOUNT_NAME_REQUIRED'
    });
    if (CLASSIFICATIONS.indexOf(draft.classification) === -1) found.push({
      message: 'Classification takes one of: ' + CLASSIFICATIONS.join(', ') + '.',
      code: 'INVALID_CLASSIFICATION'
    });
    if (draft.permittedToGoNegative) {
      if (limit === '') found.push({
        message: 'Overdraft limit is required when the account is permitted to go negative — it is the floor.',
        code: 'OVERDRAFT_LIMIT_REQUIRED'
      });else if (!/^\d+(\.\d+)?$/.test(limit)) found.push({
        message: 'Overdraft limit takes a positive decimal amount, written unsigned.',
        code: 'INVALID_OVERDRAFT_LIMIT'
      });else if (scaleOf(limit) > dp) found.push({
        message: 'Overdraft limit carries ' + scaleOf(limit) + ' decimal places; ' + account.currency + ' is stored at ' + dp + '.',
        code: 'AMOUNT_SCALE_EXCEEDS_CURRENCY'
      });
    } else if (limit !== '') {
      found.push({
        message: 'An overdraft limit cannot be set while the account is not permitted to go negative.',
        code: 'OVERDRAFT_LIMIT_NOT_PERMITTED'
      });
    }
    if (floorMin !== '') {
      if (!/^-?\d+(\.\d+)?$/.test(floorMin)) found.push({
        message: 'Minimum balance takes a decimal amount.',
        code: 'INVALID_MINIMUM_BALANCE'
      });else if (scaleOf(floorMin) > dp) found.push({
        message: 'Minimum balance carries ' + scaleOf(floorMin) + ' decimal places; ' + account.currency + ' is stored at ' + dp + '.',
        code: 'AMOUNT_SCALE_EXCEEDS_CURRENCY'
      });else if (!draft.permittedToGoNegative && Number(floorMin) < 0) found.push({
        message: 'Minimum balance cannot be negative while the account is not permitted to go negative.',
        code: 'MINIMUM_BALANCE_BELOW_ZERO'
      });
    }
    if (found.length) {
      setErrors(found);
      return;
    }
    setErrors([]);
    setAccount(a => ({
      ...a,
      name: draft.name.trim(),
      classification: draft.classification,
      permittedToGoNegative: draft.permittedToGoNegative,
      overdraftLimit: limit === '' ? null : limit,
      minimumBalance: floorMin === '' ? null : floorMin,
      metadata: draft.metadata
    }));
    setMode(null);
    setDraft(null);
    setFlash({
      title: 'Changes saved',
      text: 'Updated ' + account.accountNumber + '. Group, account number and currency are unchanged; no posting was made.'
    });
  };
  const record = () => {
    const created = {
      ...draft,
      id: 'r' + (SEED.length + seq + 1),
      recordNumber: 'PST-' + String(10000927 + seq).slice(1),
      accountId: account.id,
      currency: account.currency,
      amount: String(draft.amount).trim(),
      recordedBy: CALLER,
      recordedAt: '22 Sep 2026 10:12:44 UTC',
      status: 'Posted',
      reversedBy: null,
      reverses: null
    };
    setRecords(rs => [created].concat(rs));
    setSeq(n => n + 1);
    applyDelta(created.direction, created.amount);
    setSelectedId(created.id);
    setMode('view');
    setDraft(null);
    setDialog(null);
    setIdemKey(mintKey());
    setFlash({
      title: 'Record posted',
      text: created.recordNumber + ' — ' + created.direction + ' of ' + created.amount + ' ' + created.currency + ' against ' + account.accountNumber + ', effective ' + fmtDate(created.effectiveDate) + '. The balance above reflects it.'
    });
  };
  const reverse = (r, why) => {
    const counter = {
      ...r,
      id: 'r' + (SEED.length + seq + 1),
      recordNumber: 'PST-' + String(10000927 + seq).slice(1),
      direction: r.direction === 'credit' ? 'debit' : 'credit',
      category: 'reversal',
      description: 'Reverses ' + r.recordNumber + ' — ' + why,
      metadata: [],
      externalReference: null,
      recordedBy: CALLER,
      recordedAt: '22 Sep 2026 10:12:44 UTC',
      status: 'Posted',
      reversedBy: null,
      reverses: r.recordNumber,
      reversalReason: why
    };
    setRecords(rs => [counter].concat(rs.map(x => x.id === r.id ? {
      ...x,
      status: 'Reversed',
      reversedBy: counter.recordNumber,
      reversalReason: why
    } : x)));
    applyDelta(counter.direction, counter.amount);
    setSeq(n => n + 1);
    setDialog(null);
    setReason('');
    setReasonError(false);
    setSelectedId(counter.id);
    setMode('view');
    setFlash({
      title: 'Record reversed',
      text: counter.recordNumber + ' was recorded as the opposing entry and ' + r.recordNumber + ' is marked Reversed. Nothing was erased — this account carries both rows.'
    });
  };
  const mono = v => /*#__PURE__*/React.createElement(Mono, null, v);
  const columns = [{
    key: 'recordNumber',
    header: 'Record no.',
    sortable: true,
    render: r => /*#__PURE__*/React.createElement(Mono, {
      style: {
        fontWeight: 'var(--weight-semibold)'
      }
    }, r.recordNumber)
  }, {
    key: 'direction',
    header: 'Direction',
    sortable: true,
    render: r => /*#__PURE__*/React.createElement(Badge, {
      tone: r.direction === 'credit' ? 'credit' : 'debit'
    }, r.direction)
  }, {
    key: 'category',
    header: 'Category',
    sortable: true,
    render: r => /*#__PURE__*/React.createElement(Chip, null, r.category)
  }, {
    key: 'description',
    header: 'Description',
    sortable: false,
    render: r => r.description ? /*#__PURE__*/React.createElement("span", null, r.description) : /*#__PURE__*/React.createElement(Caption, null, "Not set.")
  }, {
    key: 'amount',
    header: 'Amount',
    sortable: true,
    align: 'right',
    render: r => /*#__PURE__*/React.createElement(Money, {
      amount: r.direction === 'debit' ? '-' + r.amount : r.amount,
      decimalPlaces: dec(r.currency),
      signed: true,
      struck: r.status === 'Reversed'
    })
  }, {
    key: 'currency',
    header: 'Currency',
    sortable: true,
    queryAs: 'CurrencyCode',
    render: r => /*#__PURE__*/React.createElement(Currency, {
      code: r.currency
    })
  }, {
    key: 'effectiveDate',
    header: 'Effective',
    sortable: true,
    align: 'right',
    render: r => /*#__PURE__*/React.createElement("span", {
      style: {
        fontVariantNumeric: 'tabular-nums'
      }
    }, fmtDate(r.effectiveDate))
  }, {
    key: 'status',
    header: 'Status',
    sortable: true,
    render: r => /*#__PURE__*/React.createElement(StatusBadge, {
      status: r.status
    })
  }, {
    key: 'recordedBy',
    header: 'Recorded by',
    sortable: false,
    render: r => /*#__PURE__*/React.createElement(Caption, null, /*#__PURE__*/React.createElement(Mono, null, r.recordedBy))
  }];
  const reversible = selected ? selected.status === 'Posted' && !selected.reverses : false;
  const panelOpen = mode !== null;
  const panel = /*#__PURE__*/React.createElement(DetailPanel, {
    open: panelOpen,
    onClose: closePanel,
    title: mode === 'edit-account' ? 'Edit ' + account.accountNumber : mode === 'create' ? 'Record posting' : selected ? /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(Mono, null, selected.recordNumber)), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)'
      }
    }, /*#__PURE__*/React.createElement(Chip, null, selected.category), /*#__PURE__*/React.createElement(StatusBadge, {
      status: selected.status
    }))) : '',
    footnote: mode === 'edit-account' ? 'Group, account number, currency and external reference are fixed once the account is open.' : mode === 'create' ? null : selected ? selected.status === 'Reversed' ? /*#__PURE__*/React.createElement(React.Fragment, null, "Already reversed by ", /*#__PURE__*/React.createElement(Mono, null, selected.reversedBy), " \u2014 reversing again is refused with ", /*#__PURE__*/React.createElement(Mono, null, "POSTING_ALREADY_REVERSED"), ".") : selected.reverses ? /*#__PURE__*/React.createElement(React.Fragment, null, "This record is itself a reversal of ", /*#__PURE__*/React.createElement(Mono, null, selected.reverses), ". Reversing a reversal is refused with ", /*#__PURE__*/React.createElement(Mono, null, "POSTING_IS_REVERSAL"), ".") : 'Records are immutable. Reversing records an opposing entry; it does not edit or delete this row.' : null,
    actions: mode === 'edit-account' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      onClick: closePanel
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "primary",
      onClick: saveAccount
    }, "Save changes")) : mode === 'create' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      onClick: closePanel
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "primary",
      onClick: () => {
        if (validate()) setDialog({
          kind: 'confirm'
        });
      }
    }, "Review movement")) : selected ? /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "destructive",
      disabled: !reversible,
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "rotate-ccw",
        size: 14
      }),
      onClick: () => {
        setReason('');
        setReasonError(false);
        setDialog({
          kind: 'reverse',
          record: selected
        });
      }
    }, "Reverse") : null
  }, mode === 'edit-account' && draft ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '112px minmax(0, 1fr)',
      gap: 'var(--space-3) var(--space-4)',
      fontSize: 'var(--text-table-size)'
    }
  }, /*#__PURE__*/React.createElement(FormRow, {
    label: "Account no."
  }, /*#__PURE__*/React.createElement(ReadOnlyField, null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Mono, null, account.accountNumber), /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 13,
    style: {
      color: 'var(--muted-foreground)'
    }
  })))), /*#__PURE__*/React.createElement(FormRow, {
    label: "Currency"
  }, /*#__PURE__*/React.createElement(ReadOnlyField, null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Currency, {
    code: account.currency
  }), /*#__PURE__*/React.createElement(Caption, null, dp, " dp"), /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 13,
    style: {
      color: 'var(--muted-foreground)'
    }
  })))), /*#__PURE__*/React.createElement(FormRow, {
    label: "Name",
    required: true
  }, /*#__PURE__*/React.createElement(Input, {
    value: draft.name,
    invalid: errors.some(e => e.code === 'ACCOUNT_NAME_REQUIRED'),
    onChange: e => set({
      name: e.target.value
    }),
    style: {
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement(FormRow, {
    label: "Classification",
    required: true
  }, /*#__PURE__*/React.createElement(Select, {
    options: CLASSIFICATIONS,
    value: draft.classification,
    onChange: e => set({
      classification: e.target.value
    }),
    style: {
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement(FormRow, {
    label: "Floor policy",
    hint: draft.permittedToGoNegative ? 'An overdraft limit is required while this is on — the floor is \u2212limit.' : 'The floor is the minimum balance, or zero when none is set.'
  }, /*#__PURE__*/React.createElement(Checkbox, {
    checked: draft.permittedToGoNegative,
    onChange: e => set({
      permittedToGoNegative: e.target.checked,
      overdraftLimit: e.target.checked ? draft.overdraftLimit : ''
    }),
    label: "Permitted to go negative"
  })), /*#__PURE__*/React.createElement(FormRow, {
    label: "Overdraft limit",
    required: draft.permittedToGoNegative,
    hint: draft.permittedToGoNegative ? 'Unsigned, at ' + dp + ' decimal places.' : null
  }, draft.permittedToGoNegative ? /*#__PURE__*/React.createElement(Input, {
    numeric: true,
    value: draft.overdraftLimit,
    placeholder: "50000.00",
    invalid: errors.some(e => e.code.indexOf('OVERDRAFT') > -1),
    onChange: e => set({
      overdraftLimit: e.target.value
    }),
    style: {
      width: 160
    },
    "aria-label": "Overdraft limit"
  }) : /*#__PURE__*/React.createElement(ReadOnlyField, null, /*#__PURE__*/React.createElement(Caption, null, "Unavailable while the account may not go negative."))), /*#__PURE__*/React.createElement(FormRow, {
    label: "Minimum balance",
    hint: "Optional. Sent as null when left empty."
  }, /*#__PURE__*/React.createElement(Input, {
    numeric: true,
    value: draft.minimumBalance,
    placeholder: "0.00",
    invalid: errors.some(e => e.code.indexOf('MINIMUM') > -1),
    onChange: e => set({
      minimumBalance: e.target.value
    }),
    style: {
      width: 160
    },
    "aria-label": "Minimum balance"
  }))), /*#__PURE__*/React.createElement(DetailSection, null, "Metadata"), /*#__PURE__*/React.createElement(MetadataEditor, {
    entries: draft.metadata,
    onChange: entries => set({
      metadata: entries
    })
  }), /*#__PURE__*/React.createElement(Note, {
    style: {
      marginTop: 'var(--space-3)'
    }
  }, "String keys and values only."), /*#__PURE__*/React.createElement("div", {
    ref: errorRef
  }, errors.length ? /*#__PURE__*/React.createElement(RefusalAlert, {
    errors: errors,
    style: {
      marginTop: 'var(--space-4)'
    }
  }) : null)) : mode === 'view' && selected ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(DetailSection, {
    divider: false,
    style: {
      marginTop: 0
    }
  }, "Movement"), /*#__PURE__*/React.createElement(DetailList, {
    items: [{
      label: 'Direction',
      value: /*#__PURE__*/React.createElement(Badge, {
        tone: selected.direction === 'credit' ? 'credit' : 'debit'
      }, selected.direction)
    }, {
      label: 'Amount',
      value: /*#__PURE__*/React.createElement(Money, {
        amount: selected.direction === 'debit' ? '-' + selected.amount : selected.amount,
        currency: selected.currency,
        decimalPlaces: dec(selected.currency),
        signed: true,
        showCurrency: true,
        struck: selected.status === 'Reversed'
      })
    }, {
      label: 'Effective',
      value: fmtDate(selected.effectiveDate)
    }, {
      label: 'Category',
      value: selected.category
    }]
  }), /*#__PURE__*/React.createElement(DetailSection, null, "References"), /*#__PURE__*/React.createElement(DetailList, {
    items: [{
      label: 'Description',
      value: selected.description || /*#__PURE__*/React.createElement(Caption, null, "Not set.")
    }, {
      label: 'Counterparty',
      value: selected.counterpartyAccountId ? mono((ACCOUNTS.find(a => a.id === selected.counterpartyAccountId) || {}).accountNumber || selected.counterpartyAccountId) : /*#__PURE__*/React.createElement(Caption, null, "Not set.")
    }, {
      label: 'Counterparty ref.',
      value: selected.counterpartyReference ? mono(selected.counterpartyReference) : /*#__PURE__*/React.createElement(Caption, null, "Not set.")
    }, {
      label: 'Transaction group',
      value: selected.transactionGroupId ? mono(selected.transactionGroupId) : /*#__PURE__*/React.createElement(Caption, null, "Not set.")
    }, {
      label: 'External ref.',
      value: selected.externalReference ? mono(selected.externalReference) : /*#__PURE__*/React.createElement(Caption, null, "Not set.")
    }]
  }), selected.metadata.length ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(DetailSection, null, "Metadata"), /*#__PURE__*/React.createElement(MetadataEditor, {
    readOnly: true,
    entries: selected.metadata
  })) : null, selected.reversedBy || selected.reverses ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(DetailSection, null, "Reversal lineage"), /*#__PURE__*/React.createElement("div", {
    style: {
      borderLeft: '3px solid var(--primary)',
      paddingLeft: 'var(--space-3)',
      fontSize: 'var(--text-table-size)'
    }
  }, selected.reversedBy ? /*#__PURE__*/React.createElement(React.Fragment, null, "Reversed by ", /*#__PURE__*/React.createElement(Mono, null, selected.reversedBy), ". Both rows stay on the account; the balance reflects the pair.") : /*#__PURE__*/React.createElement(React.Fragment, null, "Reverses ", /*#__PURE__*/React.createElement(Mono, null, selected.reverses), ". This is the correcting entry, not a deletion."), selected.reversalReason ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-2)',
      color: 'var(--muted-foreground)'
    }
  }, "Reason: ", selected.reversalReason) : null)) : null, /*#__PURE__*/React.createElement(DetailSection, null, "Audit"), /*#__PURE__*/React.createElement(DetailList, {
    items: [{
      label: 'Recorded by',
      value: mono(selected.recordedBy)
    }, {
      label: 'Recorded',
      value: selected.recordedAt
    }]
  })) : draft ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '112px minmax(0, 1fr)',
      gap: 'var(--space-3) var(--space-4)',
      fontSize: 'var(--text-table-size)'
    }
  }, /*#__PURE__*/React.createElement(FormRow, {
    label: "Account"
  }, /*#__PURE__*/React.createElement(ReadOnlyField, null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Mono, null, account.accountNumber), /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 13,
    style: {
      color: 'var(--muted-foreground)'
    }
  })))), /*#__PURE__*/React.createElement(FormRow, {
    label: "Currency"
  }, /*#__PURE__*/React.createElement(ReadOnlyField, null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Currency, {
    code: account.currency
  }), /*#__PURE__*/React.createElement(Caption, null, dp, " dp"), /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 13,
    style: {
      color: 'var(--muted-foreground)'
    }
  })))), /*#__PURE__*/React.createElement(FormRow, {
    label: "Direction",
    required: true,
    hint: account.status === 'Dormant' ? 'Debits are disabled: this account is dormant. A credit can still be recorded.' : null
  }, /*#__PURE__*/React.createElement(Select, {
    options: [{
      value: 'credit',
      label: 'Credit'
    }, {
      value: 'debit',
      label: 'Debit'
    }],
    value: draft.direction,
    onChange: e => set({
      direction: e.target.value
    }),
    style: {
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement(FormRow, {
    label: "Amount",
    required: true,
    hint: 'Unsigned, at ' + dp + ' decimal places. Balance is now ' + Number(account.balance).toFixed(dp) + ' ' + account.currency + '.'
  }, /*#__PURE__*/React.createElement(Input, {
    numeric: true,
    value: draft.amount,
    placeholder: "0.00",
    invalid: errors.some(e => e.code.indexOf('AMOUNT') > -1 || e.code === 'INSUFFICIENT_FUNDS'),
    onChange: e => set({
      amount: e.target.value
    }),
    style: {
      width: 168
    },
    "aria-label": "Amount"
  })), /*#__PURE__*/React.createElement(FormRow, {
    label: "Effective",
    hint: "Defaults to today. Future dates are blocked here rather than refused by the service."
  }, /*#__PURE__*/React.createElement(Input, {
    type: "date",
    value: draft.effectiveDate || '',
    max: TODAY,
    invalid: errors.some(e => e.code === 'EFFECTIVE_DATE_IN_FUTURE'),
    onChange: e => set({
      effectiveDate: e.target.value === '' ? null : e.target.value
    }),
    style: {
      width: 168
    },
    "aria-label": "Effective date"
  })), /*#__PURE__*/React.createElement(FormRow, {
    label: "Category",
    required: true
  }, /*#__PURE__*/React.createElement(Select, {
    options: CATEGORIES,
    value: draft.category,
    onChange: e => set({
      category: e.target.value
    }),
    style: {
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement(FormRow, {
    label: "Description",
    hint: "Optional. Sent as null when left empty."
  }, /*#__PURE__*/React.createElement(Textarea, {
    rows: 2,
    value: draft.description || '',
    placeholder: "What this record is for.",
    onChange: e => set({
      description: e.target.value === '' ? null : e.target.value
    })
  }))), /*#__PURE__*/React.createElement(DetailSection, null, "Counterparty and grouping"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '112px minmax(0, 1fr)',
      gap: 'var(--space-3) var(--space-4)',
      fontSize: 'var(--text-table-size)'
    }
  }, /*#__PURE__*/React.createElement(FormRow, {
    label: "Counterparty"
  }, /*#__PURE__*/React.createElement(Select, {
    options: [{
      value: '',
      label: 'None'
    }].concat(ACCOUNTS.filter(a => a.id !== account.id).map(a => ({
      value: a.id,
      label: a.accountNumber
    }))),
    value: draft.counterpartyAccountId || '',
    onChange: e => set({
      counterpartyAccountId: e.target.value === '' ? null : e.target.value
    }),
    style: {
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement(FormRow, {
    label: "Counterparty ref.",
    hint: "The other side's own identifier, where there is no account in this ledger."
  }, /*#__PURE__*/React.createElement(Input, {
    mono: true,
    value: draft.counterpartyReference || '',
    placeholder: "swift:MT103-88213",
    onChange: e => set({
      counterpartyReference: e.target.value === '' ? null : e.target.value
    }),
    style: {
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement(FormRow, {
    label: "Transaction group",
    hint: "Ties records that move together. Left empty, this record stands alone."
  }, /*#__PURE__*/React.createElement(Input, {
    mono: true,
    value: draft.transactionGroupId || '',
    placeholder: "tgr_88f102",
    onChange: e => set({
      transactionGroupId: e.target.value === '' ? null : e.target.value
    }),
    style: {
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement(FormRow, {
    label: "External ref."
  }, /*#__PURE__*/React.createElement(Input, {
    mono: true,
    value: draft.externalReference || '',
    placeholder: "erp:pay-4471",
    onChange: e => set({
      externalReference: e.target.value === '' ? null : e.target.value
    }),
    style: {
      width: '100%'
    }
  }))), /*#__PURE__*/React.createElement(DetailSection, null, "Metadata"), /*#__PURE__*/React.createElement(MetadataEditor, {
    entries: draft.metadata,
    onChange: entries => set({
      metadata: entries
    })
  }), /*#__PURE__*/React.createElement(Note, {
    style: {
      marginTop: 'var(--space-3)'
    }
  }, "String keys and values only."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-5)'
    }
  }, /*#__PURE__*/React.createElement(IdempotencyKeyField, {
    value: idemKey
  })), /*#__PURE__*/React.createElement("div", {
    ref: errorRef
  }, errors.length ? /*#__PURE__*/React.createElement(RefusalAlert, {
    errors: errors,
    style: {
      marginTop: 'var(--space-4)'
    }
  }) : null)) : null);
  const postable = account.status === 'Active' || account.status === 'Dormant';
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(AppShell, {
    sidebar: /*#__PURE__*/React.createElement(Sidebar, {
      sections: NAV,
      active: "accounts"
    }),
    topbarRight: /*#__PURE__*/React.createElement(UserMenu, {
      name: "Steven Ho",
      email: "steven.ho@transwap.com",
      tenant: "Transwap",
      objectId: "8f2c41de-90a1-4c33-b0f2-77e5a1c9d412",
      scopes: ['accounts.read', 'accounts.write', 'postings.read', 'postings.write'],
      missingScopes: ['postings.reverse'],
      onSignOut: () => {}
    }),
    breadcrumb: /*#__PURE__*/React.createElement(Breadcrumb, {
      items: [{
        label: 'Ledger',
        href: '#'
      }, {
        label: 'Accounts',
        href: '../accounts-crud/index.html'
      }, {
        label: account.accountNumber
      }]
    }),
    panel: panel,
    panelOpen: panelOpen,
    style: {
      minWidth: 1180
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    icon: "wallet",
    title: account.accountNumber,
    description: account.name + ' · group ' + account.groupId + ' · ' + account.currency + ' · ' + account.classification + ' · opened ' + account.openedOn,
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(StatusBadge, {
      status: account.status
    }), /*#__PURE__*/React.createElement(Button, {
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "pencil",
        size: 14
      }),
      onClick: openEditAccount,
      "aria-label": 'Edit ' + account.accountNumber,
      title: "Edit account",
      style: {
        height: 36,
        padding: '0 10px'
      }
    }), /*#__PURE__*/React.createElement(Button, {
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "download",
        size: 14
      }),
      onClick: () => setFlash({
        title: 'Export queued',
        text: rows.length + ' records on ' + account.accountNumber + ' will be written to CSV and mailed to you when ready.'
      })
    }, "Export"), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "plus",
        size: 14
      }),
      disabled: !postable,
      onClick: openCreate
    }, "Record posting"))
  }), !postable ? /*#__PURE__*/React.createElement(Note, null, account.accountNumber, " is ", account.status.toLowerCase(), " \u2014 recording is refused with ", /*#__PURE__*/React.createElement(Mono, null, "ACCOUNT_NOT_POSTABLE"), ". Its records stay readable.") : null, flash ? /*#__PURE__*/React.createElement(Card, {
    style: {
      borderLeft: '3px solid var(--credit)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(Label, null, flash.title), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      fontSize: 'var(--text-table-size)'
    }
  }, flash.text)), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "ghost",
    onClick: () => setFlash(null),
    style: {
      marginLeft: 'auto',
      color: 'var(--muted-foreground)'
    },
    "aria-label": "Dismiss"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 14
  }))) : null, /*#__PURE__*/React.createElement(BalanceTiles, {
    account: {
      balance: account.balance,
      availableBalance: account.balance,
      heldAmount: account.heldAmount,
      currency: account.currency,
      decimalPlaces: dp
    }
  }), /*#__PURE__*/React.createElement(FloorLine, {
    account: {
      permittedToGoNegative: account.permittedToGoNegative,
      overdraftLimit: account.overdraftLimit,
      minimumBalance: account.minimumBalance,
      currency: account.currency,
      decimalPlaces: dp
    }
  }), /*#__PURE__*/React.createElement(Card, {
    padded: false
  }, /*#__PURE__*/React.createElement(CardBar, {
    position: "top"
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "Search record or reference",
    prefix: /*#__PURE__*/React.createElement(Icon, {
      name: "search",
      size: 14
    }),
    value: query,
    onChange: e => setQuery(e.target.value),
    style: {
      width: 240
    },
    "aria-label": "Search records on this account"
  }), query ? /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "ghost",
    onClick: () => setQuery(''),
    style: {
      color: 'var(--muted-foreground)'
    }
  }, "Clear") : null, /*#__PURE__*/React.createElement(Caption, {
    style: {
      marginLeft: 'auto'
    }
  }, rows.length, " of ", records.length), /*#__PURE__*/React.createElement(FilterMenu, {
    activeCount: (period !== '30d' ? 1 : 0) + (directionFilter !== 'Any' ? 1 : 0) + (categoryFilter !== 'Any' ? 1 : 0) + (statusFilter !== 'Any' ? 1 : 0),
    onClear: () => {
      setPeriod('30d');
      setDirectionFilter('Any');
      setCategoryFilter('Any');
      setStatusFilter('Any');
    }
  }, /*#__PURE__*/React.createElement(FilterField, {
    label: "Period",
    hint: "Effective date. 90 days is the widest window."
  }, /*#__PURE__*/React.createElement(Select, {
    options: PERIODS,
    value: period,
    onChange: e => setPeriod(e.target.value),
    style: {
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement(FilterField, {
    label: "Direction"
  }, /*#__PURE__*/React.createElement(Select, {
    options: ['Any', 'credit', 'debit'],
    value: directionFilter,
    onChange: e => setDirectionFilter(e.target.value),
    style: {
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement(FilterField, {
    label: "Category"
  }, /*#__PURE__*/React.createElement(Select, {
    options: ['Any'].concat(CATEGORIES),
    value: categoryFilter,
    onChange: e => setCategoryFilter(e.target.value),
    style: {
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement(FilterField, {
    label: "Status"
  }, /*#__PURE__*/React.createElement(Select, {
    options: ['Any', 'Posted', 'Reversed'],
    value: statusFilter,
    onChange: e => setStatusFilter(e.target.value),
    style: {
      width: '100%'
    }
  })))), /*#__PURE__*/React.createElement(LedgerTable, {
    columns: columns,
    rows: visible,
    selectedId: selectedId,
    onSelectRow: r => mode === 'create' && dirty ? setDialog({
      kind: 'discard'
    }) : openView(r),
    orderBy: sort.field,
    desc: sort.desc,
    onSort: field => setSort(s => ({
      field,
      desc: s.field === field ? !s.desc : true
    })),
    emptyMessage: "No records on this account in this period."
  }), /*#__PURE__*/React.createElement(Pagination, {
    page: current,
    pageCount: pageCount,
    pageSize: pageSize,
    pageSizeOptions: [5, 10, 25, 50],
    onPageChange: setPage,
    onPageSizeChange: n => {
      setPageSize(n);
      setPage(1);
    }
  })), /*#__PURE__*/React.createElement(Note, null, "This table sorts, so it is not a statement. ", /*#__PURE__*/React.createElement(Mono, null, "Balance after"), " is carried in stream order on the account's statement, where the sequence is what makes the running balance true.")), dialog && dialog.kind === 'confirm' && draft ? /*#__PURE__*/React.createElement(ConfirmMovement, {
    open: true,
    direction: draft.direction === 'credit' ? 'Credit' : 'Debit',
    amount: draft.amount,
    currency: account.currency,
    decimalPlaces: dp,
    accountNumber: account.accountNumber,
    accountName: account.name,
    effectiveDate: fmtDate(draft.effectiveDate),
    category: draft.category,
    consequence: "Posting is immediate and final. The record cannot be edited afterwards; a correction is recorded as an opposing record.",
    onBack: () => setDialog(null),
    onConfirm: record,
    confirmLabel: "Record posting"
  }) : null, dialog && dialog.kind === 'reverse-confirm' && dialog.record ? /*#__PURE__*/React.createElement(ConfirmMovement, {
    open: true,
    direction: dialog.record.direction === 'credit' ? 'Debit' : 'Credit',
    amount: dialog.record.amount,
    currency: dialog.record.currency,
    decimalPlaces: dec(dialog.record.currency),
    accountNumber: account.accountNumber,
    accountName: account.name,
    effectiveDate: fmtDate(dialog.record.effectiveDate),
    category: "reversal",
    consequence: /*#__PURE__*/React.createElement(React.Fragment, null, "A new opposing record is posted and ", /*#__PURE__*/React.createElement(Mono, null, dialog.record.recordNumber), " is marked Reversed. Nothing is erased \u2014 the account carries both rows. Reason: ", reason.trim()),
    onBack: () => setDialog({
      kind: 'reverse',
      record: dialog.record
    }),
    onConfirm: () => reverse(dialog.record, reason.trim()),
    confirmLabel: "Reverse record"
  }) : null, /*#__PURE__*/React.createElement(Dialog, {
    open: Boolean(dialog && dialog.kind === 'reverse'),
    tone: "destructive",
    title: "Reverse record",
    onClose: () => {
      setDialog(null);
      setReasonError(false);
    },
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      onClick: () => {
        setDialog(null);
        setReasonError(false);
      }
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      variant: "destructive",
      onClick: () => {
        if (!reason.trim()) {
          setReasonError(true);
          return;
        }
        setReasonError(false);
        setDialog({
          kind: 'reverse-confirm',
          record: dialog.record
        });
      }
    }, "Continue"))
  }, dialog && dialog.record ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", null, "Reversing ", /*#__PURE__*/React.createElement(Mono, null, dialog.record.recordNumber), " posts an opposing entry against ", /*#__PURE__*/React.createElement(Mono, null, account.accountNumber), ". Nothing is erased."), /*#__PURE__*/React.createElement(Caption, {
    style: {
      display: 'block',
      marginTop: 'var(--space-4)'
    }
  }, "Reason", /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      color: 'var(--destructive-solid)',
      marginLeft: 2
    }
  }, "*")), /*#__PURE__*/React.createElement(Textarea, {
    rows: 3,
    value: reason,
    invalid: reasonError,
    placeholder: "Why this record is being reversed.",
    onChange: e => {
      setReason(e.target.value);
      if (e.target.value.trim()) setReasonError(false);
    },
    style: {
      marginTop: 6
    }
  }), /*#__PURE__*/React.createElement(Note, {
    style: {
      marginTop: 'var(--space-3)'
    }
  }, "Required. Stored on both records and shown in the reversal lineage \u2014 this is the audit trail for the correction."), reasonError ? /*#__PURE__*/React.createElement(RefusalAlert, {
    errors: [{
      message: 'A reason is required to reverse a record.',
      code: 'REVERSAL_REASON_REQUIRED'
    }],
    style: {
      marginTop: 'var(--space-3)'
    }
  }) : null) : null), /*#__PURE__*/React.createElement(Dialog, {
    open: Boolean(dialog && dialog.kind === 'discard'),
    title: "Discard unsent record?",
    onClose: () => setDialog(null),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      onClick: () => setDialog(null)
    }, "Keep editing"), /*#__PURE__*/React.createElement(Button, {
      variant: "destructive",
      onClick: discard
    }, "Discard record"))
  }, "This record has not been sent. Closing the panel drops it, and the idempotency key is discarded with it."));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(AccountDetailScreen, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/account-detail/AccountDetail.jsx", error: String((e && e.message) || e) }); }

// ui_kits/account-groups-crud/AccountGroups.jsx
try { (() => {
const {
  AppShell,
  Sidebar,
  PageHeader,
  UserMenu,
  Card,
  CardBar,
  Pagination,
  LedgerTable,
  Button,
  Icon,
  Chip,
  StatusBadge,
  Label,
  Caption,
  Note,
  Mono,
  Breadcrumb,
  Input,
  Select,
  Textarea,
  MetadataEditor,
  DetailPanel,
  DetailList,
  DetailSection,
  Dialog,
  RefusalAlert,
  ReadOnlyField,
  FilterMenu,
  FilterField
} = window.DKNetAccountsDesignSystem_97519d;
const NAV = [{
  title: 'LEDGER',
  items: [{
    id: 'overview',
    label: 'Overview',
    icon: 'layout-dashboard',
    href: '../overview/index.html'
  }, {
    id: 'accounts',
    label: 'Accounts',
    icon: 'wallet',
    href: '../accounts-crud/index.html'
  }, {
    id: 'records',
    label: 'Records',
    icon: 'file-text',
    href: '../records-crud/index.html'
  }]
}, {
  title: 'ADMINISTRATION',
  pinToBottom: true,
  items: [{
    id: 'groups',
    label: 'Account groups',
    icon: 'folder',
    href: '#'
  }, {
    id: 'currencies',
    label: 'Currencies',
    icon: 'coins',
    href: '../currencies-crud/index.html'
  }]
}];
const TYPES = ['customer', 'internal', 'suspense', 'settlement'];
const SEED = [{
  id: 'g1',
  code: 'ACME',
  name: 'Acme Corporation',
  description: 'Customer funds held for Acme and its subsidiaries.',
  type: 'customer',
  ownerId: 'usr_4f21c8',
  metadata: [{
    key: 'region',
    value: 'apac'
  }, {
    key: 'tier',
    value: 'enterprise'
  }],
  status: 'Active',
  accounts: 14,
  holdsBalance: true,
  createdOn: '18 Sep 2026'
}, {
  id: 'g2',
  code: 'MERCH',
  name: 'Merchant settlement',
  description: 'Settlement accounts per acquiring corridor.',
  type: 'settlement',
  ownerId: 'usr_9a30de',
  metadata: [{
    key: 'corridor',
    value: 'sg-my'
  }],
  status: 'Active',
  accounts: 6,
  holdsBalance: true,
  createdOn: '14 Sep 2026'
}, {
  id: 'g3',
  code: 'SUSP',
  name: 'Suspense — unmatched',
  description: 'Holding group for postings awaiting attribution.',
  type: 'suspense',
  ownerId: 'usr_4f21c8',
  metadata: [],
  status: 'Active',
  accounts: 2,
  holdsBalance: true,
  createdOn: '12 Sep 2026'
}, {
  id: 'g4',
  code: 'TREAS',
  name: 'Treasury',
  description: null,
  type: 'internal',
  ownerId: 'usr_1b77a0',
  metadata: [{
    key: 'desk',
    value: 'sgd'
  }],
  status: 'Active',
  accounts: 9,
  holdsBalance: true,
  createdOn: '02 Sep 2026'
}, {
  id: 'g5',
  code: 'FEES',
  name: 'Fee income',
  description: 'Internal fee recognition accounts.',
  type: 'internal',
  ownerId: 'usr_1b77a0',
  metadata: [],
  status: 'Active',
  accounts: 3,
  holdsBalance: false,
  createdOn: '28 Aug 2026'
}, {
  id: 'g6',
  code: 'PILOT-01',
  name: 'Pilot — closed programme',
  description: 'Retired pilot programme. Retained for audit.',
  type: 'customer',
  ownerId: 'usr_9a30de',
  metadata: [{
    key: 'closedBy',
    value: 'usr_4f21c8'
  }],
  status: 'Closed',
  accounts: 0,
  holdsBalance: false,
  createdOn: '11 Aug 2026'
}];
const BLANK = {
  code: '',
  name: '',
  description: null,
  type: 'customer',
  ownerId: '',
  metadata: []
};

/* The authenticated caller. The API's auth layer stamps the owner from the token, so it is
   never a form field — it is shown back on the group. */
const CALLER = 'usr_4f21c8';
function FormRow({
  label,
  hint,
  required = false,
  children
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Caption, {
    style: {
      paddingTop: 8
    }
  }, label, required ? /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      color: 'var(--destructive-solid)',
      marginLeft: 2
    }
  }, "*") : null), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, children, hint ? /*#__PURE__*/React.createElement(Note, {
    style: {
      marginTop: 6
    }
  }, hint) : null));
}
function AccountGroupsScreen() {
  const [groups, setGroups] = React.useState(SEED);
  const [selectedId, setSelectedId] = React.useState(null);
  const [mode, setMode] = React.useState(null);
  const [draft, setDraft] = React.useState(null);
  const [errors, setErrors] = React.useState([]);
  const [dialog, setDialog] = React.useState(null);
  const [flash, setFlash] = React.useState(null);
  const [typeFilter, setTypeFilter] = React.useState('Any');
  const [statusFilter, setStatusFilter] = React.useState('Any');
  const [query, setQuery] = React.useState('');
  const [sort, setSort] = React.useState({
    field: 'code',
    desc: false
  });
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const errorRef = React.useRef(null);
  React.useEffect(() => {
    if (!errors.length) return;
    let p = errorRef.current && errorRef.current.parentElement;
    while (p && p.scrollHeight <= p.clientHeight) p = p.parentElement;
    if (p) p.scrollTop = p.scrollHeight;
  }, [errors]);
  const selected = groups.find(g => g.id === selectedId) || null;
  const original = mode === 'edit' && selected ? selected : BLANK;
  const dirty = draft ? JSON.stringify({
    ...original,
    id: 0
  }) !== JSON.stringify({
    ...draft,
    id: 0
  }) : false;
  const rows = groups.filter(g => (typeFilter === 'Any' || g.type === typeFilter) && (statusFilter === 'Any' || g.status === statusFilter) && (query.trim() === '' || (g.code + ' ' + g.name + ' ' + (g.description || '') + ' ' + g.ownerId).toLowerCase().includes(query.trim().toLowerCase()))).sort((a, b) => {
    const dir = sort.desc ? -1 : 1;
    const x = a[sort.field],
      y = b[sort.field];
    return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y))) * dir;
  });
  React.useEffect(() => {
    setPage(1);
  }, [typeFilter, statusFilter, query]);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount);
  const visible = rows.slice((current - 1) * pageSize, current * pageSize);
  const set = part => setDraft(d => ({
    ...d,
    ...part
  }));
  const closePanel = () => {
    if (mode !== 'view' && dirty) {
      setDialog({
        kind: 'discard'
      });
      return;
    }
    setMode(null);
    setDraft(null);
    setErrors([]);
    setSelectedId(null);
  };
  const discard = () => {
    setDialog(null);
    setMode(null);
    setDraft(null);
    setErrors([]);
    setSelectedId(null);
  };
  const openView = g => {
    setSelectedId(g.id);
    setMode('view');
    setDraft(null);
    setErrors([]);
  };
  const openEdit = g => {
    setSelectedId(g.id);
    setDraft({
      ...g,
      metadata: g.metadata.map(m => ({
        ...m
      }))
    });
    setMode('edit');
    setErrors([]);
  };
  const openCreate = () => {
    setSelectedId(null);
    setDraft({
      ...BLANK,
      metadata: []
    });
    setMode('create');
    setErrors([]);
  };
  const save = () => {
    const found = [];
    const code = (draft.code || '').trim();
    if (!code) found.push({
      message: 'Code is required.',
      code: 'GROUP_CODE_REQUIRED'
    });else if (!/^[A-Z0-9-]{3,16}$/.test(code)) found.push({
      message: 'Code takes 3–16 characters, upper case, digits and hyphens only.',
      code: 'INVALID_GROUP_CODE'
    });else if (mode === 'create' && groups.some(g => g.code === code)) found.push({
      message: 'Code ' + code + ' is already taken by an existing group.',
      code: 'GROUP_CODE_TAKEN'
    });
    if (!(draft.name || '').trim()) found.push({
      message: 'Name is required.',
      code: 'GROUP_NAME_REQUIRED'
    });
    if (found.length) {
      setErrors(found);
      return;
    }
    setErrors([]);
    if (mode === 'create') {
      const created = {
        ...draft,
        code,
        ownerId: CALLER,
        id: 'g' + (groups.length + 1),
        status: 'Active',
        accounts: 0,
        holdsBalance: false,
        createdOn: '22 Sep 2026'
      };
      setGroups(gs => [created, ...gs]);
      setSelectedId(created.id);
      setFlash({
        title: 'Group created',
        text: 'Created ' + created.code + ' — ' + created.name + '. No accounts are open in it yet.'
      });
    } else {
      setGroups(gs => gs.map(g => g.id === draft.id ? {
        ...draft
      } : g));
      setFlash({
        title: 'Changes saved',
        text: 'Updated ' + draft.code + '. Code and currency of existing accounts are unaffected.'
      });
    }
    setMode('view');
    setDraft(null);
  };
  const archive = g => {
    setGroups(gs => gs.map(x => x.id === g.id ? {
      ...x,
      status: 'Closed'
    } : x));
    setDialog(null);
    setFlash({
      title: 'Group closed',
      text: g.code + ' is closed. Existing accounts stay readable; no new account can be opened in it.'
    });
  };
  const mono = v => /*#__PURE__*/React.createElement(Mono, null, v);
  const columns = [{
    key: 'code',
    header: 'Code',
    sortable: true,
    render: r => /*#__PURE__*/React.createElement(Mono, {
      style: {
        fontWeight: 'var(--weight-semibold)'
      }
    }, r.code)
  }, {
    key: 'name',
    header: 'Name',
    sortable: true
  }, {
    key: 'type',
    header: 'Type',
    sortable: true,
    render: r => /*#__PURE__*/React.createElement(Chip, null, r.type)
  }, {
    key: 'ownerId',
    header: 'Owner',
    sortable: true,
    render: r => mono(r.ownerId)
  }, {
    key: 'status',
    header: 'Status',
    sortable: true,
    render: r => /*#__PURE__*/React.createElement(StatusBadge, {
      status: r.status
    })
  }, {
    key: 'accounts',
    header: 'Accounts',
    sortable: false,
    align: 'right'
  }, {
    key: 'createdOn',
    header: 'Created',
    sortable: false,
    align: 'right',
    render: r => /*#__PURE__*/React.createElement(Caption, null, r.createdOn)
  }];
  const panelOpen = mode !== null;
  const panel = /*#__PURE__*/React.createElement(DetailPanel, {
    open: panelOpen,
    onClose: closePanel,
    title: mode === 'create' ? 'New account group' : mode === 'edit' ? 'Edit ' + (draft ? draft.code || 'group' : '') : selected ? /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", null, selected.code + ' · ' + selected.name), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)'
      }
    }, /*#__PURE__*/React.createElement(Chip, null, selected.type), /*#__PURE__*/React.createElement(StatusBadge, {
      status: selected.status
    }))) : '',
    footnote: mode === 'view' ? null : mode === 'edit' ? 'Code, type and owner are immutable after creation. Renaming does not touch account numbers.' : 'Code, type and owner are fixed once the group is created. The code becomes the prefix of every account number in it.',
    actions: mode === 'view' ? selected ? /*#__PURE__*/React.createElement(React.Fragment, null, selected.status === 'Closed' ? /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "primary",
      onClick: () => setGroups(gs => gs.map(x => x.id === selected.id ? {
        ...x,
        status: 'Active'
      } : x))
    }, "Reopen group") : /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "destructive",
      disabled: selected.holdsBalance,
      onClick: () => setDialog({
        kind: 'close',
        group: selected
      })
    }, "Close group"), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "primary",
      onClick: () => openEdit(selected)
    }, "Edit group")) : null : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      onClick: closePanel
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "primary",
      onClick: save
    }, mode === 'create' ? 'Create group' : 'Save changes'))
  }, mode === 'view' && selected ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(DetailSection, {
    divider: false,
    style: {
      marginTop: 0
    }
  }, "Details"), /*#__PURE__*/React.createElement(DetailList, {
    items: [{
      label: 'Code',
      value: mono(selected.code)
    }, {
      label: 'Name',
      value: selected.name
    }, {
      label: 'Description',
      value: selected.description ? selected.description : /*#__PURE__*/React.createElement(Caption, null, "Not set.")
    }, {
      label: 'Owner',
      value: mono(selected.ownerId)
    }]
  }), selected.metadata.length ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(DetailSection, null, "Metadata"), /*#__PURE__*/React.createElement(MetadataEditor, {
    readOnly: true,
    entries: selected.metadata
  })) : null, /*#__PURE__*/React.createElement(DetailSection, null, "Content"), /*#__PURE__*/React.createElement(DetailList, {
    items: [{
      label: 'Accounts',
      value: selected.accounts
    }, {
      label: 'Created',
      value: selected.createdOn
    }, {
      label: 'Balances',
      value: /*#__PURE__*/React.createElement(Caption, null, "Reported per currency on the group page, never combined into a single total.")
    }]
  })) : draft ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '92px minmax(0, 1fr)',
      gap: 'var(--space-3) var(--space-4)',
      fontSize: 'var(--text-table-size)'
    }
  }, /*#__PURE__*/React.createElement(FormRow, {
    label: "Code",
    required: true,
    hint: mode === 'create' ? 'Upper case, digits and hyphens. Becomes the account-number prefix. Cannot be changed later.' : null
  }, mode === 'edit' ? /*#__PURE__*/React.createElement(ReadOnlyField, null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Mono, null, draft.code), /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 13,
    style: {
      color: 'var(--muted-foreground)'
    }
  }))) : /*#__PURE__*/React.createElement(Input, {
    mono: true,
    value: draft.code,
    placeholder: "ACME",
    invalid: errors.some(e => e.code.indexOf('CODE') > -1),
    onChange: e => set({
      code: e.target.value.toUpperCase()
    }),
    style: {
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement(FormRow, {
    label: "Name",
    required: true
  }, /*#__PURE__*/React.createElement(Input, {
    value: draft.name,
    placeholder: "Acme Corporation",
    invalid: errors.some(e => e.code === 'GROUP_NAME_REQUIRED'),
    onChange: e => set({
      name: e.target.value
    }),
    style: {
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement(FormRow, {
    label: "Type",
    required: true,
    hint: mode === 'create' ? 'Fixed once the group is created.' : null
  }, mode === 'edit' ? /*#__PURE__*/React.createElement(ReadOnlyField, null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6
    }
  }, draft.type, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 13,
    style: {
      color: 'var(--muted-foreground)'
    }
  }))) : /*#__PURE__*/React.createElement(Select, {
    options: TYPES,
    value: draft.type,
    onChange: e => set({
      type: e.target.value
    }),
    style: {
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement(FormRow, {
    label: "Description",
    hint: "Optional. Sent as null when left empty."
  }, /*#__PURE__*/React.createElement(Textarea, {
    rows: 3,
    value: draft.description || '',
    placeholder: "What this group holds.",
    onChange: e => set({
      description: e.target.value === '' ? null : e.target.value
    })
  }))), /*#__PURE__*/React.createElement(DetailSection, null, "Metadata"), /*#__PURE__*/React.createElement(MetadataEditor, {
    entries: draft.metadata,
    onChange: entries => set({
      metadata: entries
    })
  }), /*#__PURE__*/React.createElement(Note, {
    style: {
      marginTop: 'var(--space-3)'
    }
  }, "String keys and values only."), /*#__PURE__*/React.createElement("div", {
    ref: errorRef
  }, errors.length ? /*#__PURE__*/React.createElement(RefusalAlert, {
    errors: errors,
    style: {
      marginTop: 'var(--space-4)'
    }
  }) : null)) : null);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(AppShell, {
    sidebar: /*#__PURE__*/React.createElement(Sidebar, {
      sections: NAV,
      active: "groups"
    }),
    topbarRight: /*#__PURE__*/React.createElement(UserMenu, {
      name: "Steven Ho",
      email: "steven.ho@transwap.com",
      tenant: "Transwap",
      objectId: "8f2c41de-90a1-4c33-b0f2-77e5a1c9d412",
      scopes: ['accounts.read', 'accounts.write', 'postings.read', 'postings.write'],
      missingScopes: ['postings.reverse'],
      onSignOut: () => {}
    }),
    breadcrumb: /*#__PURE__*/React.createElement(Breadcrumb, {
      items: [{
        label: 'Administration',
        href: '#'
      }, {
        label: 'Account groups'
      }]
    }),
    panel: panel,
    panelOpen: panelOpen,
    style: {
      minWidth: 1180
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    icon: "folder",
    title: "Account groups",
    description: "The Group multiple bank accounts. The group's code is the prefix of account numbers.",
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "download",
        size: 14
      }),
      onClick: () => setFlash({
        title: 'Export queued',
        text: rows.length + ' groups will be written to CSV and mailed to you when ready.'
      })
    }, "Export"), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "plus",
        size: 14
      }),
      onClick: openCreate
    }, "New group"))
  }), flash ? /*#__PURE__*/React.createElement(Card, {
    style: {
      borderLeft: '3px solid var(--credit)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(Label, null, flash.title), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      fontSize: 'var(--text-table-size)'
    }
  }, flash.text)), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "ghost",
    onClick: () => setFlash(null),
    style: {
      marginLeft: 'auto',
      color: 'var(--muted-foreground)'
    },
    "aria-label": "Dismiss"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 14
  }))) : null, /*#__PURE__*/React.createElement(Card, {
    padded: false
  }, /*#__PURE__*/React.createElement(CardBar, {
    position: "top"
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "Search code, name or owner",
    prefix: /*#__PURE__*/React.createElement(Icon, {
      name: "search",
      size: 14
    }),
    value: query,
    onChange: e => setQuery(e.target.value),
    style: {
      width: 272
    },
    "aria-label": "Search account groups"
  }), query ? /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "ghost",
    onClick: () => setQuery(''),
    style: {
      color: 'var(--muted-foreground)'
    }
  }, "Clear") : null, /*#__PURE__*/React.createElement(Caption, {
    style: {
      marginLeft: 'auto'
    }
  }, rows.length, " of ", groups.length), /*#__PURE__*/React.createElement(FilterMenu, {
    activeCount: (typeFilter !== 'Any' ? 1 : 0) + (statusFilter !== 'Any' ? 1 : 0),
    onClear: () => {
      setTypeFilter('Any');
      setStatusFilter('Any');
    }
  }, /*#__PURE__*/React.createElement(FilterField, {
    label: "Type"
  }, /*#__PURE__*/React.createElement(Select, {
    options: ['Any'].concat(TYPES),
    value: typeFilter,
    onChange: e => setTypeFilter(e.target.value),
    style: {
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement(FilterField, {
    label: "Status"
  }, /*#__PURE__*/React.createElement(Select, {
    options: ['Any', 'Active', 'Closed'],
    value: statusFilter,
    onChange: e => setStatusFilter(e.target.value),
    style: {
      width: '100%'
    }
  })))), "          ", /*#__PURE__*/React.createElement(LedgerTable, {
    columns: columns,
    rows: visible,
    selectedId: selectedId,
    onSelectRow: r => mode !== 'view' && mode !== null && dirty ? setDialog({
      kind: 'discard'
    }) : openView(r),
    orderBy: sort.field,
    desc: sort.desc,
    onSort: field => setSort(s => ({
      field,
      desc: s.field === field ? !s.desc : false
    })),
    emptyMessage: "No groups match this filter."
  }), /*#__PURE__*/React.createElement(Pagination, {
    page: current,
    pageCount: pageCount,
    pageSize: pageSize,
    pageSizeOptions: [5, 10, 25, 50],
    onPageChange: setPage,
    onPageSizeChange: n => {
      setPageSize(n);
      setPage(1);
    }
  }))), /*#__PURE__*/React.createElement(Dialog, {
    open: Boolean(dialog && dialog.kind === 'close'),
    tone: "destructive",
    title: "Close Account Group",
    onClose: () => setDialog(null),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      onClick: () => setDialog(null)
    }, "Keep group open"), /*#__PURE__*/React.createElement(Button, {
      variant: "destructive",
      onClick: () => archive(dialog.group)
    }, "Close group"))
  }, dialog && dialog.group ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", null, "Closing ", /*#__PURE__*/React.createElement(Mono, null, dialog.group.code), " stops any new account being opened in it. The ", dialog.group.accounts, " account", dialog.group.accounts === 1 ? '' : 's', " already in the group stay readable and keep their balances."), /*#__PURE__*/React.createElement(Note, {
    style: {
      marginTop: 'var(--space-3)'
    }
  }, "Reversible \u2014 a closed group can be reopened from this panel.")) : null), /*#__PURE__*/React.createElement(Dialog, {
    open: Boolean(dialog && dialog.kind === 'discard'),
    title: "Discard unsaved changes?",
    onClose: () => setDialog(null),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      onClick: () => setDialog(null)
    }, "Keep editing"), /*#__PURE__*/React.createElement(Button, {
      variant: "destructive",
      onClick: discard
    }, "Discard changes"))
  }, "This form has edits that have not been sent. Closing the panel drops them."));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(AccountGroupsScreen, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/account-groups-crud/AccountGroups.jsx", error: String((e && e.message) || e) }); }

// ui_kits/accounts-crud/Accounts.jsx
try { (() => {
const {
  AppShell,
  Sidebar,
  PageHeader,
  UserMenu,
  Card,
  CardBar,
  Pagination,
  LedgerTable,
  Button,
  Icon,
  Chip,
  StatusBadge,
  Label,
  Caption,
  Note,
  Mono,
  Breadcrumb,
  Input,
  Select,
  Checkbox,
  MetadataEditor,
  AccountNumber,
  FilterMenu,
  FilterField,
  Money,
  Currency,
  BalanceTiles,
  FloorLine,
  DetailPanel,
  DetailList,
  DetailSection,
  Dialog,
  RefusalAlert,
  ReadOnlyField
} = window.DKNetAccountsDesignSystem_97519d;
const NAV = [{
  title: 'LEDGER',
  items: [{
    id: 'overview',
    label: 'Overview',
    icon: 'layout-dashboard',
    href: '../overview/index.html'
  }, {
    id: 'accounts',
    label: 'Accounts',
    icon: 'wallet',
    href: '#'
  }, {
    id: 'records',
    label: 'Records',
    icon: 'file-text',
    href: '../records-crud/index.html'
  }]
}, {
  title: 'ADMINISTRATION',
  pinToBottom: true,
  items: [{
    id: 'groups',
    label: 'Account groups',
    icon: 'folder',
    href: '../account-groups-crud/index.html'
  }, {
    id: 'currencies',
    label: 'Currencies',
    icon: 'coins',
    href: '../currencies-crud/index.html'
  }]
}];
const GROUPS = ['ACME', 'MERCH', 'SUSP', 'TREAS', 'FEES'];
const CURRENCIES = {
  SGD: 2,
  USD: 2,
  JPY: 0,
  KWD: 3,
  USDC: 6,
  IDR: 0
};
const CLASSIFICATIONS = ['asset', 'liability', 'equity', 'revenue', 'expense'];
const dec = code => code in CURRENCIES ? CURRENCIES[code] : 2;
const SEED = [{
  id: 'a1',
  accountNumber: 'ACME-000123',
  groupId: 'ACME',
  name: 'Operating account',
  currency: 'SGD',
  classification: 'liability',
  permittedToGoNegative: false,
  overdraftLimit: '',
  minimumBalance: '0',
  externalReference: 'erp:acme-op-01',
  metadata: [{
    key: 'region',
    value: 'apac'
  }, {
    key: 'tier',
    value: 'enterprise'
  }],
  status: 'Active',
  balance: 12400,
  availableBalance: 12400,
  heldAmount: 0,
  openedOn: '18 Sep 2026'
}, {
  id: 'a2',
  accountNumber: 'MERCH-000044',
  groupId: 'MERCH',
  name: 'Settlement — APAC',
  currency: 'SGD',
  classification: 'liability',
  permittedToGoNegative: true,
  overdraftLimit: '50000',
  minimumBalance: '',
  externalReference: null,
  metadata: [{
    key: 'corridor',
    value: 'sg-my'
  }],
  status: 'Active',
  balance: -1820.4,
  availableBalance: -1820.4,
  heldAmount: 0,
  openedOn: '14 Sep 2026'
}, {
  id: 'a3',
  accountNumber: 'SUSP-000002',
  groupId: 'SUSP',
  name: 'Suspense — unmatched',
  currency: 'SGD',
  classification: 'asset',
  permittedToGoNegative: false,
  overdraftLimit: '',
  minimumBalance: '',
  externalReference: null,
  metadata: [],
  status: 'Frozen',
  balance: 1204.55,
  availableBalance: 1204.55,
  heldAmount: 0,
  openedOn: '12 Sep 2026'
}, {
  id: 'a4',
  accountNumber: 'TREAS-000007',
  groupId: 'TREAS',
  name: 'Treasury — USD nostro',
  currency: 'USD',
  classification: 'asset',
  permittedToGoNegative: true,
  overdraftLimit: '250000',
  minimumBalance: '',
  externalReference: 'swift:nostro-usd',
  metadata: [{
    key: 'desk',
    value: 'usd'
  }],
  status: 'Active',
  balance: 984210.06,
  availableBalance: 984210.06,
  heldAmount: 0,
  openedOn: '02 Sep 2026'
}, {
  id: 'a5',
  accountNumber: 'ACME-000124',
  groupId: 'ACME',
  name: 'Payroll — JPY',
  currency: 'JPY',
  classification: 'liability',
  permittedToGoNegative: false,
  overdraftLimit: '',
  minimumBalance: '100000',
  externalReference: null,
  metadata: [],
  status: 'Dormant',
  balance: 4200000,
  availableBalance: 4200000,
  heldAmount: 0,
  openedOn: '28 Aug 2026'
}, {
  id: 'a6',
  accountNumber: 'FEES-000003',
  groupId: 'FEES',
  name: 'Fee income — cards',
  currency: 'SGD',
  classification: 'revenue',
  permittedToGoNegative: false,
  overdraftLimit: '',
  minimumBalance: '',
  externalReference: null,
  metadata: [{
    key: 'product',
    value: 'cards'
  }],
  status: 'Active',
  balance: 0,
  availableBalance: 0,
  heldAmount: 0,
  openedOn: '26 Aug 2026'
}, {
  id: 'a7',
  accountNumber: 'TREAS-000008',
  groupId: 'TREAS',
  name: 'Treasury — KWD',
  currency: 'KWD',
  classification: 'asset',
  permittedToGoNegative: false,
  overdraftLimit: '',
  minimumBalance: '',
  externalReference: null,
  metadata: [],
  status: 'Active',
  balance: 18.442,
  availableBalance: 18.442,
  heldAmount: 0,
  openedOn: '19 Aug 2026'
}, {
  id: 'a8',
  accountNumber: 'MERCH-000045',
  groupId: 'MERCH',
  name: 'Settlement — retired corridor',
  currency: 'USD',
  classification: 'liability',
  permittedToGoNegative: false,
  overdraftLimit: '',
  minimumBalance: '',
  externalReference: null,
  metadata: [{
    key: 'closedBy',
    value: 'usr_4f21c8'
  }],
  status: 'Closed',
  balance: 0,
  availableBalance: 0,
  heldAmount: 0,
  openedOn: '11 Aug 2026'
}];
const BLANK = {
  groupId: '',
  accountNumber: null,
  name: '',
  currency: '',
  classification: 'asset',
  permittedToGoNegative: true,
  overdraftLimit: '',
  minimumBalance: '',
  externalReference: null,
  metadata: []
};
function FormRow({
  label,
  hint,
  required = false,
  children
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Caption, {
    style: {
      paddingTop: 8
    }
  }, label, required ? /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      color: 'var(--destructive-solid)',
      marginLeft: 2
    }
  }, "*") : null), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, children, hint ? /*#__PURE__*/React.createElement(Note, {
    style: {
      marginTop: 6
    }
  }, hint) : null));
}
function Locked({
  children
}) {
  return /*#__PURE__*/React.createElement(ReadOnlyField, null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6
    }
  }, children, /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 13,
    style: {
      color: 'var(--muted-foreground)'
    }
  })));
}
const scaleOf = v => (String(v).split('.')[1] || '').length;
function AccountsScreen() {
  const [accounts, setAccounts] = React.useState(SEED);
  const [selectedId, setSelectedId] = React.useState(null);
  const [mode, setMode] = React.useState(null);
  const [draft, setDraft] = React.useState(null);
  const [errors, setErrors] = React.useState([]);
  const [dialog, setDialog] = React.useState(null);
  const [flash, setFlash] = React.useState(null);
  const [groupFilter, setGroupFilter] = React.useState('Any');
  const [currencyFilter, setCurrencyFilter] = React.useState('Any');
  const [statusFilter, setStatusFilter] = React.useState('Any');
  const [query, setQuery] = React.useState('');
  const [sort, setSort] = React.useState({
    field: 'accountNumber',
    desc: false
  });
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const errorRef = React.useRef(null);
  React.useEffect(() => {
    if (!errors.length) return;
    let p = errorRef.current && errorRef.current.parentElement;
    while (p && p.scrollHeight <= p.clientHeight) p = p.parentElement;
    if (p) p.scrollTop = p.scrollHeight;
  }, [errors]);
  const selected = accounts.find(a => a.id === selectedId) || null;
  const original = mode === 'edit' && selected ? selected : BLANK;
  const dirty = draft ? JSON.stringify({
    ...original,
    id: 0
  }) !== JSON.stringify({
    ...draft,
    id: 0
  }) : false;
  const rows = accounts.filter(a => (groupFilter === 'Any' || a.groupId === groupFilter) && (currencyFilter === 'Any' || a.currency === currencyFilter) && (statusFilter === 'Any' || a.status === statusFilter) && (query.trim() === '' || (a.accountNumber + ' ' + a.name + ' ' + (a.externalReference || '')).toLowerCase().includes(query.trim().toLowerCase()))).sort((a, b) => {
    const dir = sort.desc ? -1 : 1;
    const x = a[sort.field],
      y = b[sort.field];
    return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y))) * dir;
  });
  React.useEffect(() => {
    setPage(1);
  }, [groupFilter, currencyFilter, statusFilter, query]);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount);
  const visible = rows.slice((current - 1) * pageSize, current * pageSize);
  const set = part => setDraft(d => ({
    ...d,
    ...part
  }));
  const closePanel = () => {
    if (mode !== 'view' && dirty) {
      setDialog({
        kind: 'discard'
      });
      return;
    }
    setMode(null);
    setDraft(null);
    setErrors([]);
    setSelectedId(null);
  };
  const discard = () => {
    setDialog(null);
    setMode(null);
    setDraft(null);
    setErrors([]);
    setSelectedId(null);
  };
  const openView = a => {
    setSelectedId(a.id);
    setMode('view');
    setDraft(null);
    setErrors([]);
  };
  const openEdit = a => {
    setSelectedId(a.id);
    setDraft({
      ...a,
      metadata: a.metadata.map(m => ({
        ...m
      }))
    });
    setMode('edit');
    setErrors([]);
  };
  const openCreate = () => {
    setSelectedId(null);
    setDraft({
      ...BLANK,
      metadata: []
    });
    setMode('create');
    setErrors([]);
  };
  const save = () => {
    const found = [];
    const dp = dec(draft.currency);
    const limit = String(draft.overdraftLimit || '').trim();
    const floorMin = String(draft.minimumBalance || '').trim();
    if (!draft.groupId) found.push({
      message: 'Group is required — an account is always opened inside a group.',
      code: 'ACCOUNT_GROUP_REQUIRED'
    });
    if (!(draft.name || '').trim()) found.push({
      message: 'Name is required.',
      code: 'ACCOUNT_NAME_REQUIRED'
    });
    if (!draft.currency) found.push({
      message: 'Currency is required and cannot be changed after the account is opened.',
      code: 'ACCOUNT_CURRENCY_REQUIRED'
    });
    if (CLASSIFICATIONS.indexOf(draft.classification) === -1) found.push({
      message: 'Classification takes one of: ' + CLASSIFICATIONS.join(', ') + '.',
      code: 'INVALID_CLASSIFICATION'
    });
    if (draft.permittedToGoNegative) {
      if (limit === '') found.push({
        message: 'Overdraft limit is required when the account is permitted to go negative — it is the floor.',
        code: 'OVERDRAFT_LIMIT_REQUIRED'
      });else if (!/^\d+(\.\d+)?$/.test(limit)) found.push({
        message: 'Overdraft limit takes a positive decimal amount, written unsigned.',
        code: 'INVALID_OVERDRAFT_LIMIT'
      });else if (scaleOf(limit) > dp) found.push({
        message: 'Overdraft limit carries ' + scaleOf(limit) + ' decimal places; ' + (draft.currency || 'this currency') + ' is stored at ' + dp + '.',
        code: 'AMOUNT_SCALE_EXCEEDS_CURRENCY'
      });
    } else if (limit !== '') {
      found.push({
        message: 'An overdraft limit cannot be set while the account is not permitted to go negative.',
        code: 'OVERDRAFT_LIMIT_NOT_PERMITTED'
      });
    }
    if (floorMin !== '') {
      if (!/^-?\d+(\.\d+)?$/.test(floorMin)) found.push({
        message: 'Minimum balance takes a decimal amount.',
        code: 'INVALID_MINIMUM_BALANCE'
      });else if (scaleOf(floorMin) > dp) found.push({
        message: 'Minimum balance carries ' + scaleOf(floorMin) + ' decimal places; ' + (draft.currency || 'this currency') + ' is stored at ' + dp + '.',
        code: 'AMOUNT_SCALE_EXCEEDS_CURRENCY'
      });else if (!draft.permittedToGoNegative && Number(floorMin) < 0) found.push({
        message: 'Minimum balance cannot be negative while the account is not permitted to go negative.',
        code: 'MINIMUM_BALANCE_BELOW_ZERO'
      });
    }
    if (found.length) {
      setErrors(found);
      return;
    }
    setErrors([]);
    if (mode === 'create') {
      const seq = accounts.reduce((m, a) => a.groupId === draft.groupId ? Math.max(m, Number(a.accountNumber.split('-')[1]) || 0) : m, 0) + 1;
      const created = {
        ...draft,
        id: 'a' + (accounts.length + 1),
        accountNumber: draft.groupId + '-' + String(1000000 + seq).slice(1),
        name: draft.name.trim(),
        status: 'Active',
        balance: 0,
        availableBalance: 0,
        heldAmount: 0,
        openedOn: '22 Sep 2026'
      };
      setAccounts(as => [created, ...as]);
      setSelectedId(created.id);
      setFlash({
        title: 'Account opened',
        text: 'Opened ' + created.accountNumber + ' in ' + created.currency + ' at a zero balance. The account number was assigned by the service and is permanent.'
      });
    } else {
      setAccounts(as => as.map(a => a.id === draft.id ? {
        ...a,
        name: draft.name.trim(),
        classification: draft.classification,
        permittedToGoNegative: draft.permittedToGoNegative,
        overdraftLimit: draft.overdraftLimit,
        minimumBalance: draft.minimumBalance,
        metadata: draft.metadata
      } : a));
      setFlash({
        title: 'Changes saved',
        text: 'Updated ' + draft.accountNumber + '. Group, account number, currency and external reference are unchanged; no posting was made.'
      });
    }
    setMode('view');
    setDraft(null);
  };
  const archive = a => {
    setAccounts(as => as.map(x => x.id === a.id ? {
      ...x,
      status: 'Closed'
    } : x));
    setDialog(null);
    setFlash({
      title: 'Account closed',
      text: a.accountNumber + ' is closed. Its statement stays readable; no posting can be recorded against it.'
    });
  };
  const mono = v => /*#__PURE__*/React.createElement(Mono, null, v);
  const columns = [{
    key: 'accountNumber',
    header: 'Account no.',
    sortable: true,
    render: r => /*#__PURE__*/React.createElement(AccountNumber, {
      value: r.accountNumber,
      href: '../account-detail/index.html?account=' + r.accountNumber,
      style: {
        fontWeight: 'var(--weight-semibold)'
      }
    })
  }, {
    key: 'name',
    header: 'Name',
    sortable: true
  }, {
    key: 'groupId',
    header: 'Group',
    sortable: true,
    render: r => mono(r.groupId)
  }, {
    key: 'classification',
    header: 'Classification',
    sortable: true,
    render: r => /*#__PURE__*/React.createElement(Chip, null, r.classification)
  }, {
    key: 'status',
    header: 'Status',
    sortable: true,
    render: r => /*#__PURE__*/React.createElement(StatusBadge, {
      status: r.status
    })
  }, {
    key: 'balance',
    header: 'Balance',
    sortable: true,
    align: 'right',
    render: r => /*#__PURE__*/React.createElement(Money, {
      amount: r.balance,
      decimalPlaces: dec(r.currency)
    })
  }, {
    key: 'availableBalance',
    header: 'Available',
    sortable: false,
    align: 'right',
    render: r => /*#__PURE__*/React.createElement(Money, {
      amount: r.availableBalance,
      decimalPlaces: dec(r.currency)
    })
  }, {
    key: 'currency',
    header: 'Currency',
    sortable: true,
    queryAs: 'CurrencyCode',
    render: r => /*#__PURE__*/React.createElement(Currency, {
      code: r.currency
    })
  }, {
    key: 'openedOn',
    header: 'Opened',
    sortable: false,
    align: 'right',
    render: r => /*#__PURE__*/React.createElement(Caption, null, r.openedOn)
  }];
  const holdsBalance = selected ? Number(selected.balance) !== 0 : false;
  const panelOpen = mode !== null;
  const panel = /*#__PURE__*/React.createElement(DetailPanel, {
    open: panelOpen,
    onClose: closePanel,
    title: mode === 'create' ? 'Open account' : mode === 'edit' ? 'Edit ' + (draft ? draft.accountNumber : '') : selected ? /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(Mono, null, selected.accountNumber)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 'var(--text-table-size)',
        fontWeight: 'var(--weight-regular)',
        color: 'var(--muted-foreground)'
      }
    }, selected.name), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)'
      }
    }, /*#__PURE__*/React.createElement(Chip, null, selected.classification), /*#__PURE__*/React.createElement(StatusBadge, {
      status: selected.status
    }))) : '',
    footnote: mode === 'view' ? selected && holdsBalance && selected.status !== 'Closed' ? /*#__PURE__*/React.createElement(React.Fragment, null, "Balance is ", /*#__PURE__*/React.createElement(Money, {
      amount: selected.balance,
      decimalPlaces: dec(selected.currency)
    }), " \u2014 closing is refused with ", /*#__PURE__*/React.createElement(Mono, null, "ACCOUNT_HOLDS_BALANCE"), ".") : null : mode === 'edit' ? 'Group, account number, currency and external reference are fixed once the account is open. Name, classification, the floor policy and metadata can be corrected.' : 'The account number is assigned by the service on open. Group, currency and external reference cannot be changed afterwards.',
    actions: mode === 'view' ? selected ? /*#__PURE__*/React.createElement(React.Fragment, null, selected.status === 'Closed' ? /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "primary",
      onClick: () => setAccounts(as => as.map(x => x.id === selected.id ? {
        ...x,
        status: 'Active'
      } : x))
    }, "Reopen account") : /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "destructive",
      disabled: holdsBalance,
      onClick: () => setDialog({
        kind: 'close',
        account: selected
      })
    }, "Close account"), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "primary",
      onClick: () => openEdit(selected)
    }, "Edit account")) : null : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      onClick: closePanel
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "primary",
      onClick: save
    }, mode === 'create' ? 'Open account' : 'Save changes'))
  }, mode === 'view' && selected ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(DetailSection, {
    divider: false,
    style: {
      marginTop: 0
    }
  }, "Balances"), /*#__PURE__*/React.createElement(BalanceTiles, {
    layout: "inline",
    account: {
      balance: selected.balance,
      availableBalance: selected.availableBalance,
      heldAmount: selected.heldAmount,
      currency: selected.currency,
      decimalPlaces: dec(selected.currency)
    }
  }), /*#__PURE__*/React.createElement(Note, {
    style: {
      marginTop: 'var(--space-3)'
    }
  }, "Balance, available and held are three values and are never combined into one."), /*#__PURE__*/React.createElement(DetailSection, null, "Identity"), /*#__PURE__*/React.createElement(DetailList, {
    items: [{
      label: 'Account no.',
      value: mono(selected.accountNumber)
    }, {
      label: 'Name',
      value: selected.name
    }, {
      label: 'Group',
      value: mono(selected.groupId)
    }, {
      label: 'Currency',
      value: /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(Currency, {
        code: selected.currency
      }), " ", /*#__PURE__*/React.createElement(Caption, null, dec(selected.currency), " dp"))
    }, {
      label: 'Classification',
      value: selected.classification
    }]
  }), /*#__PURE__*/React.createElement(DetailSection, null, "Floor policy"), /*#__PURE__*/React.createElement(DetailList, {
    items: [{
      label: 'May go negative',
      value: selected.permittedToGoNegative ? 'Yes' : 'No'
    }, {
      label: 'Overdraft limit',
      value: selected.overdraftLimit === '' || selected.overdraftLimit === null ? /*#__PURE__*/React.createElement(Caption, null, "Not set.") : /*#__PURE__*/React.createElement(Money, {
        amount: selected.overdraftLimit,
        decimalPlaces: dec(selected.currency)
      })
    }, {
      label: 'Minimum balance',
      value: selected.minimumBalance === '' || selected.minimumBalance === null ? /*#__PURE__*/React.createElement(Caption, null, "Not set.") : /*#__PURE__*/React.createElement(Money, {
        amount: selected.minimumBalance,
        decimalPlaces: dec(selected.currency)
      })
    }]
  }), /*#__PURE__*/React.createElement(FloorLine, {
    style: {
      marginTop: 'var(--space-3)'
    },
    account: {
      permittedToGoNegative: selected.permittedToGoNegative,
      overdraftLimit: selected.overdraftLimit === '' ? null : selected.overdraftLimit,
      minimumBalance: selected.minimumBalance === '' ? null : selected.minimumBalance,
      currency: selected.currency,
      decimalPlaces: dec(selected.currency)
    }
  }), selected.metadata.length ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(DetailSection, null, "Metadata"), /*#__PURE__*/React.createElement(MetadataEditor, {
    readOnly: true,
    entries: selected.metadata
  })) : null, /*#__PURE__*/React.createElement(DetailSection, null, "Audit"), /*#__PURE__*/React.createElement(DetailList, {
    items: [{
      label: 'External ref.',
      value: selected.externalReference ? mono(selected.externalReference) : /*#__PURE__*/React.createElement(Caption, null, "Not set.")
    }, {
      label: 'Opened',
      value: selected.openedOn
    }]
  })) : draft ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '104px minmax(0, 1fr)',
      gap: 'var(--space-3) var(--space-4)',
      fontSize: 'var(--text-table-size)'
    }
  }, /*#__PURE__*/React.createElement(FormRow, {
    label: "Group",
    required: true,
    hint: mode === 'create' ? 'The group code becomes the prefix of the account number.' : null
  }, mode === 'edit' ? /*#__PURE__*/React.createElement(Locked, null, /*#__PURE__*/React.createElement(Mono, null, draft.groupId)) : /*#__PURE__*/React.createElement(Select, {
    options: [{
      value: '',
      label: 'Select a group'
    }].concat(GROUPS.map(g => ({
      value: g,
      label: g
    }))),
    value: draft.groupId,
    onChange: e => set({
      groupId: e.target.value
    }),
    style: {
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement(FormRow, {
    label: "Account no."
  }, mode === 'edit' ? /*#__PURE__*/React.createElement(Locked, null, /*#__PURE__*/React.createElement(Mono, null, draft.accountNumber)) : /*#__PURE__*/React.createElement(ReadOnlyField, null, /*#__PURE__*/React.createElement(Caption, null, "Assigned by the service on open", draft.groupId ? ' — ' + draft.groupId + '-000###' : '', "."))), /*#__PURE__*/React.createElement(FormRow, {
    label: "Name",
    required: true
  }, /*#__PURE__*/React.createElement(Input, {
    value: draft.name,
    placeholder: "Operating account",
    invalid: errors.some(e => e.code === 'ACCOUNT_NAME_REQUIRED'),
    onChange: e => set({
      name: e.target.value
    }),
    style: {
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement(FormRow, {
    label: "Currency",
    required: true,
    hint: mode === 'create' ? 'Fixed once the account is open. Every amount on it is stored at this currency\u2019s scale.' : null
  }, mode === 'edit' ? /*#__PURE__*/React.createElement(Locked, null, /*#__PURE__*/React.createElement(Mono, null, draft.currency)) : /*#__PURE__*/React.createElement(Select, {
    options: [{
      value: '',
      label: 'Select a currency'
    }].concat(Object.keys(CURRENCIES).map(c => ({
      value: c,
      label: c + ' — ' + CURRENCIES[c] + ' dp'
    }))),
    value: draft.currency,
    onChange: e => set({
      currency: e.target.value
    }),
    style: {
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement(FormRow, {
    label: "Classification",
    required: true
  }, /*#__PURE__*/React.createElement(Select, {
    options: CLASSIFICATIONS,
    value: draft.classification,
    onChange: e => set({
      classification: e.target.value
    }),
    style: {
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement(FormRow, {
    label: "Floor policy",
    hint: draft.permittedToGoNegative ? 'An overdraft limit is required while this is on — the floor is \u2212limit.' : 'The floor is the minimum balance, or zero when none is set.'
  }, /*#__PURE__*/React.createElement(Checkbox, {
    checked: draft.permittedToGoNegative,
    onChange: e => set({
      permittedToGoNegative: e.target.checked,
      overdraftLimit: e.target.checked ? draft.overdraftLimit : ''
    }),
    label: "Permitted to go negative"
  })), /*#__PURE__*/React.createElement(FormRow, {
    label: "Overdraft limit",
    required: draft.permittedToGoNegative,
    hint: draft.permittedToGoNegative ? 'Unsigned. ' + (draft.currency ? draft.currency + ' at ' + dec(draft.currency) + ' decimal places.' : 'At the currency\u2019s scale.') : null
  }, draft.permittedToGoNegative ? /*#__PURE__*/React.createElement(Input, {
    numeric: true,
    value: draft.overdraftLimit,
    placeholder: "50000.00",
    invalid: errors.some(e => e.code.indexOf('OVERDRAFT') > -1),
    onChange: e => set({
      overdraftLimit: e.target.value
    }),
    style: {
      width: 160
    },
    "aria-label": "Overdraft limit"
  }) : /*#__PURE__*/React.createElement(ReadOnlyField, null, /*#__PURE__*/React.createElement(Caption, null, "Unavailable while the account may not go negative."))), /*#__PURE__*/React.createElement(FormRow, {
    label: "Minimum balance",
    hint: "Optional. Sent as null when left empty."
  }, /*#__PURE__*/React.createElement(Input, {
    numeric: true,
    value: draft.minimumBalance,
    placeholder: "0.00",
    invalid: errors.some(e => e.code.indexOf('MINIMUM') > -1),
    onChange: e => set({
      minimumBalance: e.target.value
    }),
    style: {
      width: 160
    },
    "aria-label": "Minimum balance"
  })), /*#__PURE__*/React.createElement(FormRow, {
    label: "External ref.",
    hint: mode === 'create' ? 'Optional. The calling system\u2019s own identifier. Sent as null when left empty.' : null
  }, mode === 'edit' ? /*#__PURE__*/React.createElement(Locked, null, draft.externalReference ? /*#__PURE__*/React.createElement(Mono, null, draft.externalReference) : /*#__PURE__*/React.createElement(Caption, null, "Not set.")) : /*#__PURE__*/React.createElement(Input, {
    mono: true,
    value: draft.externalReference || '',
    placeholder: "erp:acme-op-01",
    onChange: e => set({
      externalReference: e.target.value === '' ? null : e.target.value
    }),
    style: {
      width: '100%'
    }
  }))), /*#__PURE__*/React.createElement(DetailSection, null, "Metadata"), /*#__PURE__*/React.createElement(MetadataEditor, {
    entries: draft.metadata,
    onChange: entries => set({
      metadata: entries
    })
  }), /*#__PURE__*/React.createElement(Note, {
    style: {
      marginTop: 'var(--space-3)'
    }
  }, "String keys and values only."), /*#__PURE__*/React.createElement("div", {
    ref: errorRef
  }, errors.length ? /*#__PURE__*/React.createElement(RefusalAlert, {
    errors: errors,
    style: {
      marginTop: 'var(--space-4)'
    }
  }) : null)) : null);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(AppShell, {
    sidebar: /*#__PURE__*/React.createElement(Sidebar, {
      sections: NAV,
      active: "accounts"
    }),
    topbarRight: /*#__PURE__*/React.createElement(UserMenu, {
      name: "Steven Ho",
      email: "steven.ho@transwap.com",
      tenant: "Transwap",
      objectId: "8f2c41de-90a1-4c33-b0f2-77e5a1c9d412",
      scopes: ['accounts.read', 'accounts.write', 'postings.read', 'postings.write'],
      missingScopes: ['postings.reverse'],
      onSignOut: () => {}
    }),
    breadcrumb: /*#__PURE__*/React.createElement(Breadcrumb, {
      items: [{
        label: 'Ledger',
        href: '#'
      }, {
        label: 'Accounts'
      }]
    }),
    panel: panel,
    panelOpen: panelOpen,
    style: {
      minWidth: 1180
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    icon: "wallet",
    title: "Accounts",
    description: "Every account sits in one group, is denominated in one currency, and carries its own floor policy.",
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "download",
        size: 14
      }),
      onClick: () => setFlash({
        title: 'Export queued',
        text: rows.length + ' accounts will be written to CSV and mailed to you when ready.'
      })
    }, "Export"), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "plus",
        size: 14
      }),
      onClick: openCreate
    }, "Open account"))
  }), flash ? /*#__PURE__*/React.createElement(Card, {
    style: {
      borderLeft: '3px solid var(--credit)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(Label, null, flash.title), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      fontSize: 'var(--text-table-size)'
    }
  }, flash.text)), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "ghost",
    onClick: () => setFlash(null),
    style: {
      marginLeft: 'auto',
      color: 'var(--muted-foreground)'
    },
    "aria-label": "Dismiss"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 14
  }))) : null, /*#__PURE__*/React.createElement(Card, {
    padded: false
  }, /*#__PURE__*/React.createElement(CardBar, {
    position: "top"
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "Search number, name or reference",
    prefix: /*#__PURE__*/React.createElement(Icon, {
      name: "search",
      size: 14
    }),
    value: query,
    onChange: e => setQuery(e.target.value),
    style: {
      width: 272
    },
    "aria-label": "Search accounts"
  }), query ? /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "ghost",
    onClick: () => setQuery(''),
    style: {
      color: 'var(--muted-foreground)'
    }
  }, "Clear") : null, /*#__PURE__*/React.createElement(Caption, {
    style: {
      marginLeft: 'auto'
    }
  }, rows.length, " of ", accounts.length), /*#__PURE__*/React.createElement(FilterMenu, {
    activeCount: (groupFilter !== 'Any' ? 1 : 0) + (currencyFilter !== 'Any' ? 1 : 0) + (statusFilter !== 'Any' ? 1 : 0),
    onClear: () => {
      setGroupFilter('Any');
      setCurrencyFilter('Any');
      setStatusFilter('Any');
    }
  }, /*#__PURE__*/React.createElement(FilterField, {
    label: "Group"
  }, /*#__PURE__*/React.createElement(Select, {
    options: ['Any'].concat(GROUPS),
    value: groupFilter,
    onChange: e => setGroupFilter(e.target.value),
    style: {
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement(FilterField, {
    label: "Currency"
  }, /*#__PURE__*/React.createElement(Select, {
    options: ['Any'].concat(Object.keys(CURRENCIES)),
    value: currencyFilter,
    onChange: e => setCurrencyFilter(e.target.value),
    style: {
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement(FilterField, {
    label: "Status"
  }, /*#__PURE__*/React.createElement(Select, {
    options: ['Any', 'Active', 'Dormant', 'Frozen', 'Closed'],
    value: statusFilter,
    onChange: e => setStatusFilter(e.target.value),
    style: {
      width: '100%'
    }
  })))), /*#__PURE__*/React.createElement(LedgerTable, {
    columns: columns,
    rows: visible,
    selectedId: selectedId,
    onSelectRow: r => mode !== 'view' && mode !== null && dirty ? setDialog({
      kind: 'discard'
    }) : openView(r),
    orderBy: sort.field,
    desc: sort.desc,
    onSort: field => setSort(s => ({
      field,
      desc: s.field === field ? !s.desc : false
    })),
    emptyMessage: "No accounts match this filter."
  }), /*#__PURE__*/React.createElement(Pagination, {
    page: current,
    pageCount: pageCount,
    pageSize: pageSize,
    pageSizeOptions: [5, 10, 25, 50],
    onPageChange: setPage,
    onPageSizeChange: n => {
      setPageSize(n);
      setPage(1);
    }
  })), /*#__PURE__*/React.createElement(Note, null, "An account number is a link \u2014 it opens that account's page, with its records and its floor. Available and Opened carry no sort control: both are computed on the entity, so ", /*#__PURE__*/React.createElement(Mono, null, "orderBy"), " on either answers 400. Balances are reported per currency and are never combined into a single total.")), /*#__PURE__*/React.createElement(Dialog, {
    open: Boolean(dialog && dialog.kind === 'close'),
    tone: "destructive",
    title: "Close account",
    onClose: () => setDialog(null),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      onClick: () => setDialog(null)
    }, "Keep account open"), /*#__PURE__*/React.createElement(Button, {
      variant: "destructive",
      onClick: () => archive(dialog.account)
    }, "Close account"))
  }, dialog && dialog.account ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", null, "Closing ", /*#__PURE__*/React.createElement(Mono, null, dialog.account.accountNumber), " stops any further posting against it. Its statement and its ", dialog.account.metadata.length ? 'metadata' : 'history', " stay readable."), /*#__PURE__*/React.createElement(Note, {
    style: {
      marginTop: 'var(--space-3)'
    }
  }, "Reversible \u2014 a closed account can be reopened from this panel. Nothing in the ledger is erased either way.")) : null), /*#__PURE__*/React.createElement(Dialog, {
    open: Boolean(dialog && dialog.kind === 'discard'),
    title: "Discard unsaved changes?",
    onClose: () => setDialog(null),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      onClick: () => setDialog(null)
    }, "Keep editing"), /*#__PURE__*/React.createElement(Button, {
      variant: "destructive",
      onClick: discard
    }, "Discard changes"))
  }, "This form has edits that have not been sent. Closing the panel drops them."));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(AccountsScreen, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/accounts-crud/Accounts.jsx", error: String((e && e.message) || e) }); }

// ui_kits/currencies-crud/Currencies.jsx
try { (() => {
const {
  AppShell,
  Sidebar,
  PageHeader,
  UserMenu,
  Card,
  CardBar,
  Pagination,
  LedgerTable,
  Button,
  Icon,
  Chip,
  StatusBadge,
  Label,
  Caption,
  Note,
  Mono,
  Breadcrumb,
  Input,
  Select,
  Textarea,
  DetailPanel,
  DetailList,
  DetailSection,
  Dialog,
  RefusalAlert,
  ReadOnlyField,
  FilterMenu,
  FilterField
} = window.DKNetAccountsDesignSystem_97519d;
const NAV = [{
  title: 'LEDGER',
  items: [{
    id: 'overview',
    label: 'Overview',
    icon: 'layout-dashboard',
    href: '../overview/index.html'
  }, {
    id: 'accounts',
    label: 'Accounts',
    icon: 'wallet',
    href: '../accounts-crud/index.html'
  }, {
    id: 'records',
    label: 'Records',
    icon: 'file-text',
    href: '../records-crud/index.html'
  }]
}, {
  title: 'ADMINISTRATION',
  pinToBottom: true,
  items: [{
    id: 'groups',
    label: 'Account groups',
    icon: 'folder',
    href: '../account-groups-crud/index.html'
  }, {
    id: 'currencies',
    label: 'Currencies',
    icon: 'coins',
    href: '#'
  }]
}];
const SEED = [{
  id: 'c1',
  code: 'SGD',
  name: 'Singapore Dollar',
  decimalPlaces: 2,
  status: 'Active',
  accounts: 41,
  holdsBalance: true,
  createdOn: '02 Jan 2026'
}, {
  id: 'c2',
  code: 'USD',
  name: 'United States Dollar',
  decimalPlaces: 2,
  status: 'Active',
  accounts: 36,
  holdsBalance: true,
  createdOn: '02 Jan 2026'
}, {
  id: 'c3',
  code: 'JPY',
  name: 'Japanese Yen',
  decimalPlaces: 0,
  status: 'Active',
  accounts: 8,
  holdsBalance: true,
  createdOn: '14 Feb 2026'
}, {
  id: 'c4',
  code: 'KWD',
  name: 'Kuwaiti Dinar',
  decimalPlaces: 3,
  status: 'Active',
  accounts: 2,
  holdsBalance: true,
  createdOn: '03 Mar 2026'
}, {
  id: 'c5',
  code: 'USDC',
  name: 'USD Coin',
  decimalPlaces: 6,
  status: 'Active',
  accounts: 5,
  holdsBalance: false,
  createdOn: '19 Jun 2026'
}, {
  id: 'c6',
  code: 'IDR',
  name: 'Indonesian Rupiah',
  decimalPlaces: 0,
  status: 'Active',
  accounts: 3,
  holdsBalance: false,
  createdOn: '28 Jul 2026'
}, {
  id: 'c7',
  code: 'ZWL',
  name: 'Zimbabwean Dollar',
  decimalPlaces: 2,
  status: 'Closed',
  accounts: 0,
  holdsBalance: false,
  createdOn: '11 Aug 2026'
}];
const BLANK = {
  code: '',
  name: '',
  decimalPlaces: ''
};
function FormRow({
  label,
  hint,
  required = false,
  children
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Caption, {
    style: {
      paddingTop: 8
    }
  }, label, required ? /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      color: 'var(--destructive-solid)',
      marginLeft: 2
    }
  }, "*") : null), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, children, hint ? /*#__PURE__*/React.createElement(Note, {
    style: {
      marginTop: 6
    }
  }, hint) : null));
}
function sample(dp) {
  const n = Number(dp);
  if (!Number.isFinite(n)) return '—';
  return n === 0 ? '1,250' : '1,250.' + '0'.repeat(n);
}
function CurrenciesScreen() {
  const [currencies, setCurrencies] = React.useState(SEED);
  const [selectedId, setSelectedId] = React.useState(null);
  const [mode, setMode] = React.useState(null);
  const [draft, setDraft] = React.useState(null);
  const [errors, setErrors] = React.useState([]);
  const [dialog, setDialog] = React.useState(null);
  const [flash, setFlash] = React.useState(null);
  const [statusFilter, setStatusFilter] = React.useState('Any');
  const [query, setQuery] = React.useState('');
  const [sort, setSort] = React.useState({
    field: 'code',
    desc: false
  });
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const errorRef = React.useRef(null);
  React.useEffect(() => {
    if (!errors.length) return;
    let p = errorRef.current && errorRef.current.parentElement;
    while (p && p.scrollHeight <= p.clientHeight) p = p.parentElement;
    if (p) p.scrollTop = p.scrollHeight;
  }, [errors]);
  const selected = currencies.find(c => c.id === selectedId) || null;
  const original = mode === 'edit' && selected ? {
    ...selected,
    decimalPlaces: String(selected.decimalPlaces)
  } : BLANK;
  const dirty = draft ? JSON.stringify({
    ...original,
    id: 0
  }) !== JSON.stringify({
    ...draft,
    id: 0
  }) : false;
  const rows = currencies.filter(c => (statusFilter === 'Any' || c.status === statusFilter) && (query.trim() === '' || (c.code + ' ' + c.name).toLowerCase().includes(query.trim().toLowerCase()))).sort((a, b) => {
    const dir = sort.desc ? -1 : 1;
    const x = a[sort.field],
      y = b[sort.field];
    return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y))) * dir;
  });
  React.useEffect(() => {
    setPage(1);
  }, [statusFilter, query]);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount);
  const visible = rows.slice((current - 1) * pageSize, current * pageSize);
  const set = part => setDraft(d => ({
    ...d,
    ...part
  }));
  const closePanel = () => {
    if (mode !== 'view' && dirty) {
      setDialog({
        kind: 'discard'
      });
      return;
    }
    setMode(null);
    setDraft(null);
    setErrors([]);
    setSelectedId(null);
  };
  const discard = () => {
    setDialog(null);
    setMode(null);
    setDraft(null);
    setErrors([]);
    setSelectedId(null);
  };
  const openView = c => {
    setSelectedId(c.id);
    setMode('view');
    setDraft(null);
    setErrors([]);
  };
  const openEdit = c => {
    setSelectedId(c.id);
    setDraft({
      ...c,
      decimalPlaces: String(c.decimalPlaces)
    });
    setMode('edit');
    setErrors([]);
  };
  const openCreate = () => {
    setSelectedId(null);
    setDraft({
      ...BLANK
    });
    setMode('create');
    setErrors([]);
  };
  const save = () => {
    const found = [];
    const code = (draft.code || '').trim();
    const dp = String(draft.decimalPlaces).trim();
    if (!code) found.push({
      message: 'Code is required.',
      code: 'CURRENCY_CODE_REQUIRED'
    });else if (!/^[A-Z]{3,6}$/.test(code)) found.push({
      message: 'Code takes 3–6 upper-case letters — ISO 4217 for fiat, the ticker for digital assets.',
      code: 'INVALID_CURRENCY_CODE'
    });else if (mode === 'create' && currencies.some(c => c.code === code)) found.push({
      message: 'Code ' + code + ' is already registered.',
      code: 'CURRENCY_CODE_TAKEN'
    });
    if (!(draft.name || '').trim()) found.push({
      message: 'Name is required.',
      code: 'CURRENCY_NAME_REQUIRED'
    });
    if (dp === '') found.push({
      message: 'Decimal places is required — the ledger stores every amount as a minor unit at this scale.',
      code: 'DECIMAL_PLACES_REQUIRED'
    });else if (!/^\d+$/.test(dp) || Number(dp) > 8) found.push({
      message: 'Decimal places takes a whole number between 0 and 8.',
      code: 'INVALID_DECIMAL_PLACES'
    });
    if (found.length) {
      setErrors(found);
      return;
    }
    setErrors([]);
    if (mode === 'create') {
      const created = {
        code,
        name: draft.name.trim(),
        decimalPlaces: Number(dp),
        id: 'c' + (currencies.length + 1),
        status: 'Active',
        accounts: 0,
        holdsBalance: false,
        createdOn: '22 Sep 2026'
      };
      setCurrencies(cs => [created, ...cs]);
      setSelectedId(created.id);
      setFlash({
        title: 'Currency registered',
        text: 'Registered ' + created.code + ' at ' + created.decimalPlaces + ' decimal place' + (created.decimalPlaces === 1 ? '' : 's') + '. Accounts can now be opened in it.'
      });
    } else {
      setCurrencies(cs => cs.map(c => c.id === draft.id ? {
        ...c,
        name: draft.name.trim(),
        decimalPlaces: Number(dp)
      } : c));
      setFlash({
        title: 'Changes saved',
        text: 'Updated ' + draft.code + ' — name and ' + dp + ' decimal place' + (Number(dp) === 1 ? '' : 's') + '. Stored balances are unaffected.'
      });
    }
    setMode('view');
    setDraft(null);
  };
  const archive = c => {
    setCurrencies(cs => cs.map(x => x.id === c.id ? {
      ...x,
      status: 'Closed'
    } : x));
    setDialog(null);
    setFlash({
      title: 'Currency closed',
      text: c.code + ' is closed. Existing balances stay readable; no new account can be opened in it.'
    });
  };
  const mono = v => /*#__PURE__*/React.createElement(Mono, null, v);
  const columns = [{
    key: 'code',
    header: 'Code',
    sortable: true,
    render: r => /*#__PURE__*/React.createElement(Mono, {
      style: {
        fontWeight: 'var(--weight-semibold)'
      }
    }, r.code)
  }, {
    key: 'name',
    header: 'Name',
    sortable: true
  }, {
    key: 'decimalPlaces',
    header: 'Decimals',
    sortable: true,
    align: 'right',
    render: r => mono(r.decimalPlaces)
  }, {
    key: 'minorUnit',
    header: 'Minor unit',
    sortable: false,
    align: 'right',
    render: r => /*#__PURE__*/React.createElement(Caption, null, /*#__PURE__*/React.createElement(Mono, null, sample(r.decimalPlaces)))
  }, {
    key: 'status',
    header: 'Status',
    sortable: true,
    render: r => /*#__PURE__*/React.createElement(StatusBadge, {
      status: r.status
    })
  }, {
    key: 'accounts',
    header: 'Accounts',
    sortable: false,
    align: 'right'
  }, {
    key: 'createdOn',
    header: 'Created',
    sortable: false,
    align: 'right',
    render: r => /*#__PURE__*/React.createElement(Caption, null, r.createdOn)
  }];
  const panelOpen = mode !== null;
  const panel = /*#__PURE__*/React.createElement(DetailPanel, {
    open: panelOpen,
    onClose: closePanel,
    title: mode === 'create' ? 'New currency' : mode === 'edit' ? 'Edit ' + (draft ? draft.code || 'currency' : '') : selected ? /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", null, selected.code + ' · ' + selected.name), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)'
      }
    }, /*#__PURE__*/React.createElement(Chip, null, selected.decimalPlaces, " dp"), /*#__PURE__*/React.createElement(StatusBadge, {
      status: selected.status
    }))) : '',
    footnote: mode === 'view' ? null : mode === 'edit' ? 'Code is fixed after registration. Name and decimal places can be corrected.' : 'The code cannot be changed after registration.',
    actions: mode === 'view' ? selected ? /*#__PURE__*/React.createElement(React.Fragment, null, selected.status === 'Closed' ? /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "primary",
      onClick: () => setCurrencies(cs => cs.map(x => x.id === selected.id ? {
        ...x,
        status: 'Active'
      } : x))
    }, "Reopen currency") : /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "destructive",
      disabled: selected.holdsBalance,
      onClick: () => setDialog({
        kind: 'close',
        currency: selected
      })
    }, "Close currency"), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "primary",
      onClick: () => openEdit(selected)
    }, "Edit currency")) : null : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      onClick: closePanel
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "primary",
      onClick: save
    }, mode === 'create' ? 'Register currency' : 'Save changes'))
  }, mode === 'view' && selected ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(DetailSection, {
    divider: false,
    style: {
      marginTop: 0
    }
  }, "Details"), /*#__PURE__*/React.createElement(DetailList, {
    items: [{
      label: 'Code',
      value: mono(selected.code)
    }, {
      label: 'Name',
      value: selected.name
    }, {
      label: 'Decimal places',
      value: mono(selected.decimalPlaces)
    }, {
      label: 'Minor unit',
      value: /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(Mono, null, sample(selected.decimalPlaces)), " ", /*#__PURE__*/React.createElement(Caption, null, "= 1,250 ", selected.code))
    }]
  }), /*#__PURE__*/React.createElement(DetailSection, null, "Usage"), /*#__PURE__*/React.createElement(DetailList, {
    items: [{
      label: 'Accounts',
      value: selected.accounts
    }, {
      label: 'Created',
      value: selected.createdOn
    }, {
      label: 'Balances',
      value: selected.holdsBalance ? /*#__PURE__*/React.createElement(Caption, null, "Accounts in this currency hold a balance, so it cannot be closed.") : /*#__PURE__*/React.createElement(Caption, null, "No account in this currency holds a balance.")
    }]
  }), selected.holdsBalance && selected.status === 'Active' ? /*#__PURE__*/React.createElement(Note, {
    style: {
      marginTop: 'var(--space-3)'
    }
  }, "CURRENCY_HOLDS_BALANCE \u2014 close is unavailable until every balance in ", selected.code, " is zero.") : null) : draft ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '92px minmax(0, 1fr)',
      gap: 'var(--space-3) var(--space-4)',
      fontSize: 'var(--text-table-size)'
    }
  }, /*#__PURE__*/React.createElement(FormRow, {
    label: "Code",
    required: true,
    hint: mode === 'create' ? 'Upper-case letters only. ISO 4217 for fiat, the ticker for digital assets. Cannot be changed later.' : null
  }, mode === 'edit' ? /*#__PURE__*/React.createElement(ReadOnlyField, null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Mono, null, draft.code), /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 13,
    style: {
      color: 'var(--muted-foreground)'
    }
  }))) : /*#__PURE__*/React.createElement(Input, {
    mono: true,
    value: draft.code,
    placeholder: "SGD",
    invalid: errors.some(e => e.code.indexOf('CODE') > -1),
    onChange: e => set({
      code: e.target.value.toUpperCase()
    }),
    style: {
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement(FormRow, {
    label: "Name",
    required: true,
    hint: mode === 'edit' ? 'Display name only.' : null
  }, /*#__PURE__*/React.createElement(Input, {
    value: draft.name,
    placeholder: "Singapore Dollar",
    invalid: errors.some(e => e.code === 'CURRENCY_NAME_REQUIRED'),
    onChange: e => set({
      name: e.target.value
    }),
    style: {
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement(FormRow, {
    label: "Decimals",
    required: true,
    hint: draft.decimalPlaces !== '' && /^\d+$/.test(String(draft.decimalPlaces)) && Number(draft.decimalPlaces) <= 8 ? '1,250 ' + (draft.code || 'units') + ' is stored and shown as ' + sample(draft.decimalPlaces) + '.' : '0 to 8.'
  }, /*#__PURE__*/React.createElement(Input, {
    mono: true,
    value: draft.decimalPlaces,
    placeholder: "2",
    invalid: errors.some(e => e.code.indexOf('DECIMAL') > -1),
    onChange: e => set({
      decimalPlaces: e.target.value.replace(/[^0-9]/g, '')
    }),
    style: {
      width: 96
    },
    "aria-label": "Decimal places"
  }))), /*#__PURE__*/React.createElement("div", {
    ref: errorRef
  }, errors.length ? /*#__PURE__*/React.createElement(RefusalAlert, {
    errors: errors,
    style: {
      marginTop: 'var(--space-4)'
    }
  }) : null)) : null);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(AppShell, {
    sidebar: /*#__PURE__*/React.createElement(Sidebar, {
      sections: NAV,
      active: "currencies"
    }),
    topbarRight: /*#__PURE__*/React.createElement(UserMenu, {
      name: "Steven Ho",
      email: "steven.ho@transwap.com",
      tenant: "Transwap",
      objectId: "8f2c41de-90a1-4c33-b0f2-77e5a1c9d412",
      scopes: ['accounts.read', 'accounts.write', 'postings.read', 'postings.write'],
      missingScopes: ['postings.reverse'],
      onSignOut: () => {}
    }),
    breadcrumb: /*#__PURE__*/React.createElement(Breadcrumb, {
      items: [{
        label: 'Administration',
        href: '#'
      }, {
        label: 'Currencies'
      }]
    }),
    panel: panel,
    panelOpen: panelOpen,
    style: {
      minWidth: 1180
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    icon: "coins",
    title: "Currencies",
    description: "Every account is denominated in one of these. The decimal places fix how amounts are stored and shown.",
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "download",
        size: 14
      }),
      onClick: () => setFlash({
        title: 'Export queued',
        text: rows.length + ' currencies will be written to CSV and mailed to you when ready.'
      })
    }, "Export"), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "plus",
        size: 14
      }),
      onClick: openCreate
    }, "New currency"))
  }), flash ? /*#__PURE__*/React.createElement(Card, {
    style: {
      borderLeft: '3px solid var(--credit)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(Label, null, flash.title), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      fontSize: 'var(--text-table-size)'
    }
  }, flash.text)), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "ghost",
    onClick: () => setFlash(null),
    style: {
      marginLeft: 'auto',
      color: 'var(--muted-foreground)'
    },
    "aria-label": "Dismiss"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 14
  }))) : null, /*#__PURE__*/React.createElement(Card, {
    padded: false
  }, /*#__PURE__*/React.createElement(CardBar, {
    position: "top"
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "Search code or name",
    prefix: /*#__PURE__*/React.createElement(Icon, {
      name: "search",
      size: 14
    }),
    value: query,
    onChange: e => setQuery(e.target.value),
    style: {
      width: 272
    },
    "aria-label": "Search currencies"
  }), query ? /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "ghost",
    onClick: () => setQuery(''),
    style: {
      color: 'var(--muted-foreground)'
    }
  }, "Clear") : null, /*#__PURE__*/React.createElement(Caption, {
    style: {
      marginLeft: 'auto'
    }
  }, rows.length, " of ", currencies.length), /*#__PURE__*/React.createElement(FilterMenu, {
    activeCount: statusFilter !== 'Any' ? 1 : 0,
    onClear: () => {
      setStatusFilter('Any');
    }
  }, /*#__PURE__*/React.createElement(FilterField, {
    label: "Status"
  }, /*#__PURE__*/React.createElement(Select, {
    options: ['Any', 'Active', 'Closed'],
    value: statusFilter,
    onChange: e => setStatusFilter(e.target.value),
    style: {
      width: '100%'
    }
  })))), /*#__PURE__*/React.createElement(LedgerTable, {
    columns: columns,
    rows: visible,
    selectedId: selectedId,
    onSelectRow: r => mode !== 'view' && mode !== null && dirty ? setDialog({
      kind: 'discard'
    }) : openView(r),
    orderBy: sort.field,
    desc: sort.desc,
    onSort: field => setSort(s => ({
      field,
      desc: s.field === field ? !s.desc : false
    })),
    emptyMessage: "No currencies match this filter."
  }), /*#__PURE__*/React.createElement(Pagination, {
    page: current,
    pageCount: pageCount,
    pageSize: pageSize,
    pageSizeOptions: [5, 10, 25, 50],
    onPageChange: setPage,
    onPageSizeChange: n => {
      setPageSize(n);
      setPage(1);
    }
  }))), /*#__PURE__*/React.createElement(Dialog, {
    open: Boolean(dialog && dialog.kind === 'close'),
    tone: "destructive",
    title: "Close currency",
    onClose: () => setDialog(null),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      onClick: () => setDialog(null)
    }, "Keep currency open"), /*#__PURE__*/React.createElement(Button, {
      variant: "destructive",
      onClick: () => archive(dialog.currency)
    }, "Close currency"))
  }, dialog && dialog.currency ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", null, "Closing ", /*#__PURE__*/React.createElement(Mono, null, dialog.currency.code), " stops any new account being opened in it. The ", dialog.currency.accounts, " account", dialog.currency.accounts === 1 ? '' : 's', " already denominated in it stay readable and keep their balances."), /*#__PURE__*/React.createElement(Note, {
    style: {
      marginTop: 'var(--space-3)'
    }
  }, "Reversible \u2014 a closed currency can be reopened from this panel.")) : null), /*#__PURE__*/React.createElement(Dialog, {
    open: Boolean(dialog && dialog.kind === 'discard'),
    title: "Discard unsaved changes?",
    onClose: () => setDialog(null),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      onClick: () => setDialog(null)
    }, "Keep editing"), /*#__PURE__*/React.createElement(Button, {
      variant: "destructive",
      onClick: discard
    }, "Discard changes"))
  }, "This form has edits that have not been sent. Closing the panel drops them."));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(CurrenciesScreen, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/currencies-crud/Currencies.jsx", error: String((e && e.message) || e) }); }

// ui_kits/overview/Overview.jsx
try { (() => {
const {
  AppShell,
  Sidebar,
  PageHeader,
  UserMenu,
  Card,
  CardBar,
  Button,
  Icon,
  Chip,
  Input,
  Tabs,
  Label,
  Caption,
  Note,
  Mono,
  Breadcrumb,
  Money,
  Currency
} = window.DKNetAccountsDesignSystem_97519d;
const NAV = [{
  title: 'LEDGER',
  items: [{
    id: 'overview',
    label: 'Overview',
    icon: 'layout-dashboard',
    href: '#'
  }, {
    id: 'accounts',
    label: 'Accounts',
    icon: 'wallet',
    href: '../accounts-crud/index.html'
  }, {
    id: 'records',
    label: 'Records',
    icon: 'file-text',
    href: '../records-crud/index.html'
  }]
}, {
  title: 'ADMINISTRATION',
  pinToBottom: true,
  items: [{
    id: 'groups',
    label: 'Account groups',
    icon: 'folder',
    href: '../account-groups-crud/index.html'
  }, {
    id: 'currencies',
    label: 'Currencies',
    icon: 'coins',
    href: '../currencies-crud/index.html'
  }]
}];

/* Per-currency ledger position. Balance, available and held are three values —
   never one, and never added across rows. */
const BALANCES = [{
  code: 'SGD',
  name: 'Singapore Dollar',
  dp: 2,
  balance: 4182940.75,
  held: 218400,
  accounts: 41
}, {
  code: 'USD',
  name: 'United States Dollar',
  dp: 2,
  balance: 1905220,
  held: 64900,
  accounts: 36
}, {
  code: 'JPY',
  name: 'Japanese Yen',
  dp: 0,
  balance: 182400000,
  held: 0,
  accounts: 8
}, {
  code: 'KWD',
  name: 'Kuwaiti Dinar',
  dp: 3,
  balance: 41820.5,
  held: 1200,
  accounts: 2
}];
const ACCOUNT_STATUS = [{
  status: 'Active',
  count: 318,
  colour: 'var(--credit)'
}, {
  status: 'Dormant',
  count: 42,
  colour: 'var(--warning)'
}, {
  status: 'Frozen',
  count: 9,
  colour: 'var(--debit)'
}, {
  status: 'Closed',
  count: 87,
  colour: 'var(--muted-foreground)'
}];
const GROUP_TYPES = [{
  type: 'Customer',
  count: 74
}, {
  type: 'Merchant',
  count: 21
}, {
  type: 'Internal',
  count: 9
}, {
  type: 'Suspense',
  count: 4
}, {
  type: 'Settlement',
  count: 3
}];
const GROUP_STATUS = {
  Active: 104,
  Closed: 7
};

/* The list routes take fromDate / toDate on last activity, so an activity window is the
   one date control this API can actually answer. Balances are as-at and never windowed. */
const WINDOWS = [{
  value: '7',
  label: '7 days'
}, {
  value: '30',
  label: '30 days'
}, {
  value: '90',
  label: '90 days'
}, {
  value: 'all',
  label: 'All time'
}];
const ACTIVE_IN_WINDOW = {
  7: 186,
  30: 274,
  90: 341,
  all: 456
};
const GROUPS_IN_WINDOW = {
  7: 48,
  30: 79,
  90: 96,
  all: 111
};
const RECENT = [{
  number: 'ACME-000123',
  name: 'ACME operating',
  currency: 'SGD',
  seen: '22 Sep 09:14'
}, {
  number: 'ACME-000180',
  name: 'ACME settlement float',
  currency: 'SGD',
  seen: '22 Sep 08:52'
}, {
  number: 'NOVA-000014',
  name: 'Nova merchant payouts',
  currency: 'USD',
  seen: '21 Sep 17:40'
}, {
  number: 'HLDG-000002',
  name: 'Holdings suspense',
  currency: 'JPY',
  seen: '21 Sep 16:03'
}, {
  number: 'ACME-000004',
  name: 'ACME fees collected',
  currency: 'SGD',
  seen: '19 Sep 14:41'
}];
const fmt = (n, dp) => Math.abs(n).toLocaleString('en-US', {
  minimumFractionDigits: dp,
  maximumFractionDigits: dp
});
function describe(raw) {
  const v = raw.trim();
  if (!v) return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) {
    return {
      label: 'Identifier',
      text: 'Read as a UUID — account, then group, then posting. The first that resolves opens.'
    };
  }
  if (/^[A-Z][A-Z0-9]{1,9}-\d{1,10}$/i.test(v)) {
    return {
      label: 'Account no.',
      text: 'GET /v1/accounts?filter=AccountNumber:Equal:' + v.toUpperCase()
    };
  }
  if (v.length < 2) {
    return {
      label: 'Too short',
      warn: true,
      text: 'The API\u2019s search takes two characters minimum, so nothing is sent — one character would answer 400.'
    };
  }
  return {
    label: 'Free text',
    text: 'GET /v1/accounts?search=' + v + '  ·  GET /v1/account-groups?search=' + v
  };
}
function CardHead({
  label,
  children,
  right
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 'var(--space-3)',
      marginBottom: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(Label, null, label), children ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      fontSize: 'var(--text-table-size)'
    }
  }, children) : null), right ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      flex: 'none'
    }
  }, right) : null);
}
function Tile({
  label,
  value,
  children
}) {
  return /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(Label, null, label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-tile-amount-size)',
      lineHeight: 'var(--text-tile-amount-leading)',
      fontWeight: 'var(--weight-bold)',
      fontVariantNumeric: 'tabular-nums',
      marginTop: 4
    }
  }, value), /*#__PURE__*/React.createElement(Note, {
    style: {
      marginTop: 2
    }
  }, children));
}
function Swatch({
  colour,
  children
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: 8,
      height: 8,
      borderRadius: 'var(--radius-sm)',
      background: colour,
      flex: 'none'
    }
  }), /*#__PURE__*/React.createElement(Caption, {
    style: {
      minWidth: 0,
      whiteSpace: 'nowrap'
    }
  }, children));
}
const ROW_GRID = {
  display: 'grid',
  gridTemplateColumns: '150px minmax(40px, 1fr) max-content max-content max-content',
  columnGap: 'var(--space-4)',
  alignItems: 'center'
};
const CELL = {
  borderTop: '1px solid var(--border)',
  paddingTop: 'var(--space-3)',
  paddingBottom: 'var(--space-3)'
};
const AMOUNT = {
  ...CELL,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap'
};

/* One grid for the head and every row together, so the three amount columns share
   one width instead of each row sizing its own. */
function BalanceTable({
  rows
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: ROW_GRID
  }, /*#__PURE__*/React.createElement(Label, null, "Currency"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      flexWrap: 'wrap',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(Swatch, {
    colour: "var(--chart-1)"
  }, "Available"), /*#__PURE__*/React.createElement(Swatch, {
    colour: "var(--chart-4)"
  }, "Held")), /*#__PURE__*/React.createElement(Label, {
    style: {
      textAlign: 'right'
    }
  }, "Available"), /*#__PURE__*/React.createElement(Label, {
    style: {
      textAlign: 'right'
    }
  }, "Held"), /*#__PURE__*/React.createElement(Label, {
    style: {
      textAlign: 'right'
    }
  }, "Balance"), rows.map(row => {
    const available = row.balance - row.held;
    const share = row.balance === 0 ? 0 : available / row.balance * 100;
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: row.code
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...CELL,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 'var(--text-table-size)',
        fontWeight: 'var(--weight-semibold)'
      }
    }, /*#__PURE__*/React.createElement(Currency, {
      code: row.code
    })), /*#__PURE__*/React.createElement(Caption, null, row.accounts, " accounts \xB7 ", row.dp, " dp")), /*#__PURE__*/React.createElement("div", {
      style: {
        ...CELL,
        minWidth: 0,
        display: 'flex',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        width: '100%',
        height: 8,
        borderRadius: 'var(--radius-sm)',
        overflow: 'hidden',
        background: 'var(--muted)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: share + '%',
        background: 'var(--chart-1)'
      },
      title: 'Available ' + fmt(available, row.dp)
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 100 - share + '%',
        background: 'var(--chart-4)'
      },
      title: 'Held ' + fmt(row.held, row.dp)
    }))), /*#__PURE__*/React.createElement(Caption, {
      style: AMOUNT
    }, fmt(available, row.dp)), /*#__PURE__*/React.createElement(Caption, {
      style: AMOUNT
    }, fmt(row.held, row.dp)), /*#__PURE__*/React.createElement("div", {
      style: {
        ...CELL,
        textAlign: 'right'
      }
    }, /*#__PURE__*/React.createElement(Money, {
      amount: row.balance,
      decimalPlaces: row.dp
    })));
  }));
}
function StatusDonut({
  data,
  total,
  focused,
  onFocus
}) {
  const R = 46,
    C = 2 * Math.PI * R;
  let offset = 0;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-4)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: 132,
      height: 132,
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "132",
    height: "132",
    viewBox: "0 0 120 120",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("g", {
    transform: "rotate(-90 60 60)"
  }, data.map(d => {
    const len = d.count / total * C;
    const dash = /*#__PURE__*/React.createElement("circle", {
      key: d.status,
      cx: "60",
      cy: "60",
      r: R,
      fill: "none",
      stroke: d.colour,
      strokeWidth: focused === d.status ? 20 : 16,
      strokeDasharray: len + ' ' + (C - len),
      strokeDashoffset: -offset,
      style: {
        transition: 'stroke-width 120ms ease'
      }
    });
    offset += len;
    return dash;
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-tile-amount-size)',
      fontWeight: 'var(--weight-bold)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, total), /*#__PURE__*/React.createElement(Caption, null, "accounts"))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: '1 1 200px',
      minWidth: 180,
      display: 'flex',
      flexDirection: 'column'
    }
  }, data.map(d => /*#__PURE__*/React.createElement("button", {
    key: d.status,
    type: "button",
    onMouseEnter: () => onFocus(d.status),
    onMouseLeave: () => onFocus(null),
    onFocus: () => onFocus(d.status),
    onBlur: () => onFocus(null),
    style: {
      display: 'grid',
      gridTemplateColumns: '16px minmax(56px, 1fr) 44px 48px',
      alignItems: 'center',
      gap: 'var(--space-2)',
      padding: '7px var(--space-2)',
      border: 0,
      borderRadius: 'var(--radius-md)',
      background: focused === d.status ? 'var(--surface-hover)' : 'transparent',
      font: 'inherit',
      fontSize: 'var(--text-table-size)',
      color: 'var(--foreground)',
      textAlign: 'left',
      cursor: 'pointer',
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: 8,
      height: 8,
      borderRadius: 'var(--radius-sm)',
      background: d.colour
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, d.status), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: 'right',
      fontVariantNumeric: 'tabular-nums',
      fontWeight: 'var(--weight-semibold)'
    }
  }, d.count), /*#__PURE__*/React.createElement(Caption, {
    style: {
      textAlign: 'right',
      fontVariantNumeric: 'tabular-nums'
    }
  }, (d.count / total * 100).toFixed(1), "%")))));
}
function OverviewScreen() {
  const [query, setQuery] = React.useState('');
  const [window_, setWindow] = React.useState('30');
  const [focused, setFocused] = React.useState(null);
  const hint = describe(query);
  const accountTotal = ACCOUNT_STATUS.reduce((s, d) => s + d.count, 0);
  const groupTotal = GROUP_STATUS.Active + GROUP_STATUS.Closed;
  const typeMax = Math.max(...GROUP_TYPES.map(g => g.count));
  return /*#__PURE__*/React.createElement(AppShell, {
    sidebar: /*#__PURE__*/React.createElement(Sidebar, {
      sections: NAV,
      active: "overview"
    }),
    topbarRight: /*#__PURE__*/React.createElement(UserMenu, {
      name: "Steven Ho",
      email: "steven.ho@transwap.com",
      tenant: "Transwap",
      objectId: "8f2c41de-90a1-4c33-b0f2-77e5a1c9d412",
      scopes: ['accounts.read', 'accounts.write', 'postings.read', 'postings.write'],
      missingScopes: ['postings.reverse'],
      onSignOut: () => {}
    }),
    breadcrumb: /*#__PURE__*/React.createElement(Breadcrumb, {
      items: [{
        label: 'Ledger',
        href: '#'
      }, {
        label: 'Overview'
      }]
    }),
    style: {
      minWidth: 1180
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    icon: "layout-dashboard",
    title: "Overview",
    meta: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Caption, null, "Activity window"), /*#__PURE__*/React.createElement(Tabs, {
      items: WINDOWS,
      value: window_,
      onChange: setWindow
    }), /*#__PURE__*/React.createElement(Caption, null, /*#__PURE__*/React.createElement(Mono, {
      style: {
        fontSize: 'var(--text-caption-size)'
      }
    }, window_ === 'all' ? 'fromDate=0001-01-01' : 'fromDate=' + window_ + ' days ago'))),
    description: "Find an account, then read the ledger's position. Balances are as at 22 Sep 2026 09:20 UTC and are not scoped by the window.",
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "wallet",
        size: 14
      }),
      onClick: () => {
        window.location.href = '../accounts-crud/index.html';
      }
    }, "Open account"), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "plus",
        size: 14
      }),
      onClick: () => {
        window.location.href = '../records-crud/index.html';
      }
    }, "Record posting"))
  }), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(Label, null, "Find an account, group or posting"), /*#__PURE__*/React.createElement("div", {
    "data-search-shell": "",
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      marginTop: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(Input, {
    autoFocus: true,
    placeholder: "Account number, name, group code or identifier",
    prefix: /*#__PURE__*/React.createElement(Icon, {
      name: "search",
      size: 16
    }),
    value: query,
    onChange: e => setQuery(e.target.value),
    style: {
      flex: 1,
      minWidth: 0
    },
    "aria-label": "Search accounts, groups and postings"
  }), /*#__PURE__*/React.createElement(Chip, {
    style: {
      alignSelf: 'center'
    }
  }, /*#__PURE__*/React.createElement(Mono, null, "\u2318K"))), hint ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 'var(--space-3)',
      marginTop: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(Chip, null, hint.label), /*#__PURE__*/React.createElement(Note, {
    style: {
      color: hint.warn ? 'var(--warning)' : 'var(--muted-foreground)'
    }
  }, hint.warn ? hint.text : /*#__PURE__*/React.createElement(Mono, {
    style: {
      fontSize: 'var(--text-caption-size)'
    }
  }, hint.text))) : /*#__PURE__*/React.createElement(Note, {
    style: {
      marginTop: 'var(--space-3)'
    }
  }, "What you type decides the route: a UUID resolves directly, ", /*#__PURE__*/React.createElement(Mono, null, "GROUP-000123"), " filters on account number, anything else searches accounts and groups together.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
      gap: 'var(--space-5)'
    }
  }, /*#__PURE__*/React.createElement(Tile, {
    label: "Accounts",
    value: accountTotal
  }, ACTIVE_IN_WINDOW[window_], " posted to in this window \xB7 318 active"), /*#__PURE__*/React.createElement(Tile, {
    label: "Account groups",
    value: groupTotal
  }, GROUPS_IN_WINDOW[window_], " with activity in this window \xB7 ", GROUP_STATUS.Closed, " closed"), /*#__PURE__*/React.createElement(Tile, {
    label: "Currencies",
    value: 6
  }, "4 carry a balance \xB7 1 closed"), /*#__PURE__*/React.createElement(Tile, {
    label: "Needs attention",
    value: 51
  }, "42 dormant \xB7 9 frozen \u2014 ", /*#__PURE__*/React.createElement(Mono, {
    style: {
      fontSize: 'var(--text-caption-size)'
    }
  }, "filter=Status:In:Dormant,Frozen"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
      gap: 'var(--space-5)',
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHead, {
    label: "Position by currency",
    right: /*#__PURE__*/React.createElement(Caption, null, /*#__PURE__*/React.createElement(Mono, null, "GET /v1/account-groups/", '{id}', "/balances"))
  }, "Four of six registered currencies carry a balance."), /*#__PURE__*/React.createElement(BalanceTable, {
    rows: BALANCES
  }), /*#__PURE__*/React.createElement(Note, {
    style: {
      borderTop: '1px solid var(--border)',
      paddingTop: 'var(--space-3)'
    }
  }, "Balances are reported per currency and are never combined into a single total. Each bar is scaled to its own row's balance, so the split between available and held is comparable within a currency and not between them.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-5)'
    }
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHead, {
    label: "Accounts by status",
    right: /*#__PURE__*/React.createElement(Chip, null, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "triangle-alert",
      size: 12
    }), "Needs one route"))
  }, accountTotal, " accounts across ", groupTotal, " groups."), /*#__PURE__*/React.createElement(StatusDonut, {
    data: ACCOUNT_STATUS,
    total: accountTotal,
    focused: focused,
    onFocus: setFocused
  }), /*#__PURE__*/React.createElement(Note, {
    style: {
      marginTop: 'var(--space-4)',
      borderTop: '1px solid var(--border)',
      paddingTop: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(Mono, {
    style: {
      fontSize: 'var(--text-caption-size)'
    }
  }, "MapGetStatusCounts<Account>"), " exists but is mapped to no route, so these counts are illustrative. They are not computed client-side: ", /*#__PURE__*/React.createElement(Mono, {
    style: {
      fontSize: 'var(--text-caption-size)'
    }
  }, "pageSize"), " caps at 1000 and a count over a full listing would be silently wrong above that.")), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHead, {
    label: "Account groups"
  }, GROUP_STATUS.Active, " active \xB7 ", GROUP_STATUS.Closed, " closed"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)'
    }
  }, GROUP_TYPES.map(g => /*#__PURE__*/React.createElement("div", {
    key: g.type,
    style: {
      display: 'grid',
      gridTemplateColumns: '96px minmax(0, 1fr) 36px',
      gap: 'var(--space-3)',
      alignItems: 'center',
      fontSize: 'var(--text-table-size)'
    }
  }, /*#__PURE__*/React.createElement("span", null, g.type), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      height: 8,
      borderRadius: 'var(--radius-sm)',
      background: 'var(--muted)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      height: '100%',
      width: g.count / typeMax * 100 + '%',
      background: 'var(--chart-2)'
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: 'right',
      fontVariantNumeric: 'tabular-nums',
      fontWeight: 'var(--weight-semibold)'
    }
  }, g.count)))), /*#__PURE__*/React.createElement(Note, {
    style: {
      marginTop: 'var(--space-4)'
    }
  }, "Bars are scaled to Customer, the largest type. Type is queryable, so each bar is a filter: ", /*#__PURE__*/React.createElement(Mono, {
    style: {
      fontSize: 'var(--text-caption-size)'
    }
  }, "filter=Type:Equal:Customer"), ".")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
      gap: 'var(--space-5)',
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    padded: false
  }, /*#__PURE__*/React.createElement(CardBar, {
    position: "top"
  }, /*#__PURE__*/React.createElement(Label, null, "Recently viewed"), /*#__PURE__*/React.createElement(Caption, {
    style: {
      marginLeft: 'auto'
    }
  }, "Last 10 \xB7 held in this browser")), /*#__PURE__*/React.createElement("div", null, RECENT.map((r, i) => /*#__PURE__*/React.createElement("a", {
    key: r.number,
    href: '../account-detail/index.html?account=' + r.number,
    style: {
      display: 'grid',
      gridTemplateColumns: 'max-content minmax(120px, 1fr) max-content max-content 20px',
      gap: 'var(--space-4)',
      alignItems: 'center',
      textDecoration: 'none',
      color: 'inherit',
      padding: 'var(--cell-padding-y) var(--cell-padding-x)',
      borderTop: i === 0 ? 0 : '1px solid var(--border)',
      fontSize: 'var(--text-table-size)'
    }
  }, /*#__PURE__*/React.createElement(Mono, {
    style: {
      fontWeight: 'var(--weight-semibold)'
    }
  }, r.number), /*#__PURE__*/React.createElement("span", {
    style: {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, r.name), /*#__PURE__*/React.createElement(Caption, null, /*#__PURE__*/React.createElement(Mono, null, r.currency)), /*#__PURE__*/React.createElement(Caption, {
    style: {
      textAlign: 'right'
    }
  }, r.seen), /*#__PURE__*/React.createElement(Icon, {
    name: "arrow-right",
    size: 14,
    style: {
      color: 'var(--muted-foreground)'
    }
  }))))), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHead, {
    label: "Not charted, and why"
  }, "Three insights an operations dashboard usually carries cannot be drawn against this API."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      fontSize: 'var(--text-table-size)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 'var(--weight-semibold)'
    }
  }, "Posting volume over time"), /*#__PURE__*/React.createElement(Note, null, "No route lists postings across accounts. A trend line would need ", /*#__PURE__*/React.createElement(Mono, {
    style: {
      fontSize: 'var(--text-caption-size)'
    }
  }, "GET /v1/postings"), ", or a counts endpoint beside it.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 'var(--weight-semibold)'
    }
  }, "Accounts opened per month"), /*#__PURE__*/React.createElement(Note, null, /*#__PURE__*/React.createElement(Mono, {
    style: {
      fontSize: 'var(--text-caption-size)'
    }
  }, "openedOn"), " is computed on the entity, so filtering or ordering on it answers 400.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 'var(--weight-semibold)'
    }
  }, "One headline total"), /*#__PURE__*/React.createElement(Note, null, "Balances are held per currency. A single figure would require a rate source this service does not have."))))));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(OverviewScreen, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/overview/Overview.jsx", error: String((e && e.message) || e) }); }

// ui_kits/records-crud/Records.jsx
try { (() => {
const {
  AppShell,
  Sidebar,
  PageHeader,
  UserMenu,
  Card,
  CardBar,
  Pagination,
  LedgerTable,
  Button,
  Icon,
  Chip,
  StatusBadge,
  Badge,
  Label,
  Caption,
  Note,
  Mono,
  Breadcrumb,
  Input,
  Select,
  Textarea,
  MetadataEditor,
  IdempotencyKeyField,
  Money,
  Currency,
  AccountNumber,
  DetailPanel,
  DetailList,
  DetailSection,
  Dialog,
  ConfirmMovement,
  RefusalAlert,
  ReadOnlyField,
  FilterMenu,
  FilterField
} = window.DKNetAccountsDesignSystem_97519d;
const NAV = [{
  title: 'LEDGER',
  items: [{
    id: 'overview',
    label: 'Overview',
    icon: 'layout-dashboard',
    href: '../overview/index.html'
  }, {
    id: 'accounts',
    label: 'Accounts',
    icon: 'wallet',
    href: '../accounts-crud/index.html'
  }, {
    id: 'records',
    label: 'Records',
    icon: 'file-text',
    href: '#'
  }]
}, {
  title: 'ADMINISTRATION',
  pinToBottom: true,
  items: [{
    id: 'groups',
    label: 'Account groups',
    icon: 'folder',
    href: '../account-groups-crud/index.html'
  }, {
    id: 'currencies',
    label: 'Currencies',
    icon: 'coins',
    href: '../currencies-crud/index.html'
  }]
}];
const CURRENCIES = {
  SGD: 2,
  USD: 2,
  JPY: 0,
  KWD: 3,
  USDC: 6,
  IDR: 0
};
const dec = code => code in CURRENCIES ? CURRENCIES[code] : 2;
const ACCOUNTS = [{
  id: 'a1',
  accountNumber: 'ACME-000123',
  name: 'Operating account',
  currency: 'SGD',
  status: 'Active',
  balance: 12400,
  permittedToGoNegative: false,
  overdraftLimit: null,
  minimumBalance: '0'
}, {
  id: 'a2',
  accountNumber: 'MERCH-000044',
  name: 'Settlement — APAC',
  currency: 'SGD',
  status: 'Active',
  balance: -1820.4,
  permittedToGoNegative: true,
  overdraftLimit: '50000',
  minimumBalance: null
}, {
  id: 'a3',
  accountNumber: 'SUSP-000002',
  name: 'Suspense — unmatched',
  currency: 'SGD',
  status: 'Frozen',
  balance: 1204.55,
  permittedToGoNegative: false,
  overdraftLimit: null,
  minimumBalance: null
}, {
  id: 'a4',
  accountNumber: 'TREAS-000007',
  name: 'Treasury — USD nostro',
  currency: 'USD',
  status: 'Active',
  balance: 984210.06,
  permittedToGoNegative: true,
  overdraftLimit: '250000',
  minimumBalance: null
}, {
  id: 'a5',
  accountNumber: 'ACME-000124',
  name: 'Payroll — JPY',
  currency: 'JPY',
  status: 'Dormant',
  balance: 4200000,
  permittedToGoNegative: false,
  overdraftLimit: null,
  minimumBalance: '100000'
}, {
  id: 'a6',
  accountNumber: 'FEES-000003',
  name: 'Fee income — cards',
  currency: 'SGD',
  status: 'Active',
  balance: 0,
  permittedToGoNegative: false,
  overdraftLimit: null,
  minimumBalance: null
}];
const accountOf = id => ACCOUNTS.find(a => a.id === id) || null;
const CATEGORIES = ['transfer', 'fee', 'adjustment', 'settlement', 'interest', 'reversal'];
const TODAY = '2026-09-22';
const SEED = [{
  id: 'r1',
  recordNumber: 'PST-0000918',
  accountId: 'a1',
  direction: 'credit',
  amount: '4200.00',
  currency: 'SGD',
  effectiveDate: '2026-09-21',
  category: 'transfer',
  description: 'Inbound customer transfer, batch 4471.',
  counterpartyAccountId: 'a4',
  counterpartyReference: 'swift:MT103-88213',
  transactionGroupId: 'tgr_88f102',
  externalReference: 'erp:pay-4471',
  metadata: [{
    key: 'channel',
    value: 'swift'
  }],
  recordedBy: 'usr_4f21c8',
  recordedAt: '21 Sep 2026 09:14:22 UTC',
  status: 'Posted',
  reversedBy: null,
  reverses: null
}, {
  id: 'r2',
  recordNumber: 'PST-0000919',
  accountId: 'a1',
  direction: 'debit',
  amount: '18.50',
  currency: 'SGD',
  effectiveDate: '2026-09-21',
  category: 'fee',
  description: 'Transfer fee, batch 4471.',
  counterpartyAccountId: 'a6',
  counterpartyReference: null,
  transactionGroupId: 'tgr_88f102',
  externalReference: null,
  metadata: [],
  recordedBy: 'usr_4f21c8',
  recordedAt: '21 Sep 2026 09:14:22 UTC',
  status: 'Posted',
  reversedBy: null,
  reverses: null
}, {
  id: 'r3',
  recordNumber: 'PST-0000920',
  accountId: 'a2',
  direction: 'debit',
  amount: '1820.40',
  currency: 'SGD',
  effectiveDate: '2026-09-20',
  category: 'settlement',
  description: 'Corridor SG–MY settlement, cycle 208.',
  counterpartyAccountId: null,
  counterpartyReference: 'cycle:208',
  transactionGroupId: null,
  externalReference: null,
  metadata: [{
    key: 'corridor',
    value: 'sg-my'
  }],
  recordedBy: 'svc_settlement',
  recordedAt: '20 Sep 2026 23:05:01 UTC',
  status: 'Posted',
  reversedBy: null,
  reverses: null
}, {
  id: 'r4',
  recordNumber: 'PST-0000921',
  accountId: 'a4',
  direction: 'credit',
  amount: '120000.00',
  currency: 'USD',
  effectiveDate: '2026-09-19',
  category: 'transfer',
  description: null,
  counterpartyAccountId: null,
  counterpartyReference: 'nostro:funding',
  transactionGroupId: null,
  externalReference: 'trs:fund-0912',
  metadata: [],
  recordedBy: 'usr_1b77a0',
  recordedAt: '19 Sep 2026 14:41:08 UTC',
  status: 'Posted',
  reversedBy: null,
  reverses: null
}, {
  id: 'r5',
  recordNumber: 'PST-0000922',
  accountId: 'a1',
  direction: 'debit',
  amount: '950.00',
  currency: 'SGD',
  effectiveDate: '2026-09-18',
  category: 'adjustment',
  description: 'Manual adjustment, later corrected.',
  counterpartyAccountId: null,
  counterpartyReference: null,
  transactionGroupId: null,
  externalReference: null,
  metadata: [],
  recordedBy: 'usr_9a30de',
  recordedAt: '18 Sep 2026 11:02:40 UTC',
  status: 'Reversed',
  reversedBy: 'PST-0000923',
  reverses: null,
  reversalReason: 'Amount applied twice — duplicate of PST-0000918.'
}, {
  id: 'r6',
  recordNumber: 'PST-0000923',
  accountId: 'a1',
  direction: 'credit',
  amount: '950.00',
  currency: 'SGD',
  effectiveDate: '2026-09-18',
  category: 'reversal',
  description: 'Reverses PST-0000922 — amount applied twice.',
  counterpartyAccountId: null,
  counterpartyReference: null,
  transactionGroupId: null,
  externalReference: null,
  metadata: [],
  recordedBy: 'usr_9a30de',
  recordedAt: '18 Sep 2026 11:06:12 UTC',
  status: 'Posted',
  reversedBy: null,
  reverses: 'PST-0000922'
}, {
  id: 'r7',
  recordNumber: 'PST-0000924',
  accountId: 'a5',
  direction: 'credit',
  amount: '4200000',
  currency: 'JPY',
  effectiveDate: '2026-09-15',
  category: 'transfer',
  description: 'Payroll pre-fund, September cycle.',
  counterpartyAccountId: 'a4',
  counterpartyReference: null,
  transactionGroupId: 'tgr_71aa93',
  externalReference: null,
  metadata: [{
    key: 'cycle',
    value: '2026-09'
  }],
  recordedBy: 'svc_payroll',
  recordedAt: '15 Sep 2026 02:00:07 UTC',
  status: 'Posted',
  reversedBy: null,
  reverses: null
}, {
  id: 'r8',
  recordNumber: 'PST-0000925',
  accountId: 'a6',
  direction: 'credit',
  amount: '18.50',
  currency: 'SGD',
  effectiveDate: '2026-09-14',
  category: 'fee',
  description: 'Fee recognition, batch 4470.',
  counterpartyAccountId: 'a1',
  counterpartyReference: null,
  transactionGroupId: null,
  externalReference: null,
  metadata: [],
  recordedBy: 'svc_billing',
  recordedAt: '14 Sep 2026 09:30:11 UTC',
  status: 'Posted',
  reversedBy: null,
  reverses: null
}, {
  id: 'r9',
  recordNumber: 'PST-0000926',
  accountId: 'a3',
  direction: 'credit',
  amount: '1204.55',
  currency: 'SGD',
  effectiveDate: '2026-09-12',
  category: 'adjustment',
  description: 'Unmatched inbound, held pending attribution.',
  counterpartyAccountId: null,
  counterpartyReference: 'ref:unmatched-88',
  transactionGroupId: null,
  externalReference: null,
  metadata: [],
  recordedBy: 'svc_ingest',
  recordedAt: '12 Sep 2026 17:22:55 UTC',
  status: 'Posted',
  reversedBy: null,
  reverses: null
}];
const BLANK = {
  accountId: '',
  direction: 'credit',
  amount: '',
  currency: '',
  effectiveDate: TODAY,
  category: 'transfer',
  description: null,
  counterpartyAccountId: null,
  counterpartyReference: null,
  transactionGroupId: null,
  externalReference: null,
  metadata: []
};

/* The authenticated caller. The API's auth layer stamps recordedBy from the token, so it is
   never a form field — it is shown back on the record. */
const CALLER = 'usr_4f21c8';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(iso, withYear = true) {
  if (!iso) return '—';
  const p = iso.split('-');
  return p[2].replace(/^0/, '') + ' ' + MONTHS[Number(p[1]) - 1] + (withYear ? ' ' + p[0] : '');
}
const scaleOf = v => (String(v).split('.')[1] || '').length;
const mintKey = () => 'idm_' + Math.random().toString(16).slice(2, 10) + '-' + Math.random().toString(16).slice(2, 6) + '-' + Date.now().toString(16).slice(-6);
function floorOf(a) {
  if (!a) return null;
  if (a.permittedToGoNegative) return a.overdraftLimit === null || a.overdraftLimit === '' ? null : -Number(a.overdraftLimit);
  return a.minimumBalance === null || a.minimumBalance === '' ? 0 : Number(a.minimumBalance);
}
function FormRow({
  label,
  hint,
  required = false,
  children
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Caption, {
    style: {
      paddingTop: 8
    }
  }, label, required ? /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      color: 'var(--destructive-solid)',
      marginLeft: 2
    }
  }, "*") : null), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, children, hint ? /*#__PURE__*/React.createElement(Note, {
    style: {
      marginTop: 6
    }
  }, hint) : null));
}
const PERIODS = [{
  value: '7d',
  label: 'Last 7 days'
}, {
  value: '14d',
  label: 'Last 14 days'
}, {
  value: '30d',
  label: 'Last 30 days'
}, {
  value: '90d',
  label: 'Last 90 days'
}];
const PERIOD_FROM = {
  '7d': '2026-09-15',
  '14d': '2026-09-08',
  '30d': '2026-08-23',
  '90d': '2026-06-24'
};
function RecordsScreen() {
  const [records, setRecords] = React.useState(SEED);
  const [selectedId, setSelectedId] = React.useState(null);
  const [mode, setMode] = React.useState(null);
  const [draft, setDraft] = React.useState(null);
  const [errors, setErrors] = React.useState([]);
  const [idemKey, setIdemKey] = React.useState(mintKey);
  const [dialog, setDialog] = React.useState(null);
  const [reason, setReason] = React.useState('');
  const [reasonError, setReasonError] = React.useState(false);
  const [flash, setFlash] = React.useState(null);
  const [directionFilter, setDirectionFilter] = React.useState('Any');
  const [categoryFilter, setCategoryFilter] = React.useState('Any');
  const [statusFilter, setStatusFilter] = React.useState('Any');
  const [period, setPeriod] = React.useState('30d');
  const [query, setQuery] = React.useState('');
  const [sort, setSort] = React.useState({
    field: 'recordNumber',
    desc: true
  });
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const errorRef = React.useRef(null);
  React.useEffect(() => {
    if (!errors.length) return;
    let p = errorRef.current && errorRef.current.parentElement;
    while (p && p.scrollHeight <= p.clientHeight) p = p.parentElement;
    if (p) p.scrollTop = p.scrollHeight;
  }, [errors]);
  const selected = records.find(r => r.id === selectedId) || null;
  const dirty = draft ? JSON.stringify({
    ...BLANK,
    id: 0
  }) !== JSON.stringify({
    ...draft,
    id: 0
  }) : false;
  const draftAccount = draft ? accountOf(draft.accountId) : null;
  const rows = records.filter(r => (directionFilter === 'Any' || r.direction === directionFilter) && (categoryFilter === 'Any' || r.category === categoryFilter) && (statusFilter === 'Any' || r.status === statusFilter) && r.effectiveDate >= PERIOD_FROM[period] && (query.trim() === '' || [r.recordNumber, (accountOf(r.accountId) || {}).accountNumber, r.description || '', r.transactionGroupId || '', r.counterpartyReference || '', r.externalReference || ''].join(' ').toLowerCase().includes(query.trim().toLowerCase()))).sort((a, b) => {
    const dir = sort.desc ? -1 : 1;
    const x = sort.field === 'amount' ? Number(a.amount) : a[sort.field];
    const y = sort.field === 'amount' ? Number(b.amount) : b[sort.field];
    return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y))) * dir;
  });
  React.useEffect(() => {
    setPage(1);
  }, [directionFilter, categoryFilter, statusFilter, period, query]);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount);
  const visible = rows.slice((current - 1) * pageSize, current * pageSize);
  const set = part => setDraft(d => ({
    ...d,
    ...part
  }));
  const closePanel = () => {
    if (mode === 'create' && dirty) {
      setDialog({
        kind: 'discard'
      });
      return;
    }
    setMode(null);
    setDraft(null);
    setErrors([]);
    setSelectedId(null);
  };
  const discard = () => {
    setDialog(null);
    setMode(null);
    setDraft(null);
    setErrors([]);
    setSelectedId(null);
  };
  const openView = r => {
    setSelectedId(r.id);
    setMode('view');
    setDraft(null);
    setErrors([]);
  };
  const openCreate = () => {
    setSelectedId(null);
    setDraft({
      ...BLANK,
      metadata: []
    });
    setMode('create');
    setErrors([]);
    setIdemKey(mintKey());
  };
  const validate = () => {
    const found = [];
    const account = accountOf(draft.accountId);
    const amount = String(draft.amount || '').trim();
    const dp = account ? dec(account.currency) : 2;
    if (!account) found.push({
      message: 'Account is required — a record is always posted against one account.',
      code: 'ACCOUNT_REQUIRED'
    });else if (account.status === 'Frozen' || account.status === 'Closed') found.push({
      message: account.accountNumber + ' is ' + account.status.toLowerCase() + '. No record can be posted against it.',
      code: 'ACCOUNT_NOT_POSTABLE'
    });else if (account.status === 'Dormant' && draft.direction === 'debit') found.push({
      message: 'Debits are disabled: this account is dormant. A credit can still be recorded.',
      code: 'DEBIT_NOT_PERMITTED'
    });
    if (amount === '') found.push({
      message: 'Amount is required.',
      code: 'AMOUNT_REQUIRED'
    });else if (!/^\d+(\.\d+)?$/.test(amount) || Number(amount) === 0) found.push({
      message: 'Amount takes a positive decimal, written unsigned — the direction carries the sign.',
      code: 'INVALID_AMOUNT'
    });else if (account && scaleOf(amount) > dp) found.push({
      message: 'Amount carries ' + scaleOf(amount) + ' decimal places; ' + account.currency + ' is stored at ' + dp + '.',
      code: 'AMOUNT_SCALE_EXCEEDS_CURRENCY'
    });
    if (draft.effectiveDate && draft.effectiveDate > TODAY) found.push({
      message: 'Effective date cannot be in the future.',
      code: 'EFFECTIVE_DATE_IN_FUTURE'
    });
    if (account && draft.direction === 'debit' && /^\d+(\.\d+)?$/.test(amount)) {
      const floor = floorOf(account);
      const after = Number(account.balance) - Number(amount);
      if (floor !== null && after < floor) {
        found.push({
          message: 'This debit would take ' + account.accountNumber + ' to ' + after.toFixed(dp) + ', below its floor of ' + floor.toFixed(dp) + ' ' + account.currency + '.',
          code: 'INSUFFICIENT_FUNDS'
        });
      }
    }
    setErrors(found);
    return found.length === 0;
  };
  const record = () => {
    const account = accountOf(draft.accountId);
    const created = {
      ...draft,
      id: 'r' + (records.length + 1),
      recordNumber: 'PST-' + String(10000918 + records.length).slice(1),
      currency: account.currency,
      amount: String(draft.amount).trim(),
      recordedAt: '22 Sep 2026 10:12:44 UTC',
      recordedBy: CALLER,
      status: 'Posted',
      reversedBy: null,
      reverses: null
    };
    setRecords(rs => [created, ...rs]);
    setSelectedId(created.id);
    setMode('view');
    setDraft(null);
    setDialog(null);
    setIdemKey(mintKey());
    setFlash({
      title: 'Record posted',
      text: created.recordNumber + ' — ' + (created.direction === 'credit' ? 'credit' : 'debit') + ' of ' + created.amount + ' ' + created.currency + ' against ' + account.accountNumber + ', effective ' + fmtDate(created.effectiveDate) + '. A new idempotency key has been minted for the next record.'
    });
  };
  const reverse = (r, why) => {
    const account = accountOf(r.accountId);
    const counter = {
      ...r,
      id: 'r' + (records.length + 1),
      recordNumber: 'PST-' + String(10000918 + records.length).slice(1),
      direction: r.direction === 'credit' ? 'debit' : 'credit',
      category: 'reversal',
      description: 'Reverses ' + r.recordNumber + ' — ' + why + '',
      metadata: [],
      externalReference: null,
      transactionGroupId: r.transactionGroupId,
      recordedAt: '22 Sep 2026 10:12:44 UTC',
      recordedBy: CALLER,
      status: 'Posted',
      reversedBy: null,
      reverses: r.recordNumber,
      reversalReason: why
    };
    setRecords(rs => [counter].concat(rs.map(x => x.id === r.id ? {
      ...x,
      status: 'Reversed',
      reversedBy: counter.recordNumber,
      reversalReason: why
    } : x)));
    setDialog(null);
    setReason('');
    setReasonError(false);
    setSelectedId(counter.id);
    setMode('view');
    setFlash({
      title: 'Record reversed',
      text: counter.recordNumber + ' was recorded as the opposing entry and ' + r.recordNumber + ' is marked Reversed. Nothing was erased — ' + (account ? account.accountNumber : 'the account') + ' now carries both rows.'
    });
  };
  const mono = v => /*#__PURE__*/React.createElement(Mono, null, v);
  const columns = [{
    key: 'recordNumber',
    header: 'Record no.',
    sortable: true,
    render: r => /*#__PURE__*/React.createElement(Mono, {
      style: {
        fontWeight: 'var(--weight-semibold)'
      }
    }, r.recordNumber)
  }, {
    key: 'accountId',
    header: 'Account',
    sortable: true,
    render: r => {
      const a = accountOf(r.accountId);
      return a ? /*#__PURE__*/React.createElement(AccountNumber, {
        value: a.accountNumber,
        href: '../account-detail/index.html?account=' + a.accountNumber
      }) : /*#__PURE__*/React.createElement(Mono, null, r.accountId);
    }
  }, {
    key: 'direction',
    header: 'Direction',
    sortable: true,
    render: r => /*#__PURE__*/React.createElement(Badge, {
      tone: r.direction === 'credit' ? 'credit' : 'debit'
    }, r.direction)
  }, {
    key: 'category',
    header: 'Category',
    sortable: true,
    render: r => /*#__PURE__*/React.createElement(Chip, null, r.category)
  }, {
    key: 'amount',
    header: 'Amount',
    sortable: true,
    align: 'right',
    render: r => /*#__PURE__*/React.createElement(Money, {
      amount: r.direction === 'debit' ? '-' + r.amount : r.amount,
      decimalPlaces: dec(r.currency),
      signed: true,
      struck: r.status === 'Reversed'
    })
  }, {
    key: 'currency',
    header: 'Currency',
    sortable: true,
    queryAs: 'CurrencyCode',
    render: r => /*#__PURE__*/React.createElement(Currency, {
      code: r.currency
    })
  }, {
    key: 'effectiveDate',
    header: 'Effective',
    sortable: true,
    align: 'right',
    render: r => /*#__PURE__*/React.createElement("span", {
      style: {
        fontVariantNumeric: 'tabular-nums'
      }
    }, fmtDate(r.effectiveDate))
  }, {
    key: 'status',
    header: 'Status',
    sortable: true,
    render: r => /*#__PURE__*/React.createElement(StatusBadge, {
      status: r.status
    })
  }, {
    key: 'recordedBy',
    header: 'Recorded by',
    sortable: false,
    render: r => /*#__PURE__*/React.createElement(Caption, null, /*#__PURE__*/React.createElement(Mono, null, r.recordedBy))
  }];
  const reversible = selected ? selected.status === 'Posted' && !selected.reverses : false;
  const panelOpen = mode !== null;
  const panel = /*#__PURE__*/React.createElement(DetailPanel, {
    open: panelOpen,
    onClose: closePanel,
    title: mode === 'create' ? 'Record posting' : selected ? /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(Mono, null, selected.recordNumber)), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)'
      }
    }, /*#__PURE__*/React.createElement(Chip, null, selected.category), /*#__PURE__*/React.createElement(StatusBadge, {
      status: selected.status
    }))) : '',
    footnote: mode === 'create' ? null : selected ? selected.status === 'Reversed' ? /*#__PURE__*/React.createElement(React.Fragment, null, "Already reversed by ", /*#__PURE__*/React.createElement(Mono, null, selected.reversedBy), " \u2014 reversing again is refused with ", /*#__PURE__*/React.createElement(Mono, null, "POSTING_ALREADY_REVERSED"), ".") : selected.reverses ? /*#__PURE__*/React.createElement(React.Fragment, null, "This record is itself a reversal of ", /*#__PURE__*/React.createElement(Mono, null, selected.reverses), ". Reversing a reversal is refused with ", /*#__PURE__*/React.createElement(Mono, null, "POSTING_IS_REVERSAL"), ".") : 'Records are immutable. Reversing records an opposing entry; it does not edit or delete this row.' : null,
    actions: mode === 'create' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      onClick: closePanel
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "primary",
      onClick: () => {
        if (validate()) setDialog({
          kind: 'confirm'
        });
      }
    }, "Review movement")) : selected ? /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "destructive",
      disabled: !reversible,
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "rotate-ccw",
        size: 14
      }),
      onClick: () => {
        setReason('');
        setReasonError(false);
        setDialog({
          kind: 'reverse',
          record: selected
        });
      }
    }, "Reverse") : null
  }, mode === 'view' && selected ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(DetailSection, {
    divider: false,
    style: {
      marginTop: 0
    }
  }, "Movement"), /*#__PURE__*/React.createElement(DetailList, {
    items: [{
      label: 'Direction',
      value: /*#__PURE__*/React.createElement(Badge, {
        tone: selected.direction === 'credit' ? 'credit' : 'debit'
      }, selected.direction)
    }, {
      label: 'Amount',
      value: /*#__PURE__*/React.createElement(Money, {
        amount: selected.direction === 'debit' ? '-' + selected.amount : selected.amount,
        currency: selected.currency,
        decimalPlaces: dec(selected.currency),
        signed: true,
        showCurrency: true,
        struck: selected.status === 'Reversed'
      })
    }, {
      label: 'Account',
      value: mono((accountOf(selected.accountId) || {}).accountNumber || selected.accountId)
    }, {
      label: 'Effective',
      value: fmtDate(selected.effectiveDate)
    }, {
      label: 'Category',
      value: selected.category
    }]
  }), /*#__PURE__*/React.createElement(DetailSection, null, "References"), /*#__PURE__*/React.createElement(DetailList, {
    items: [{
      label: 'Description',
      value: selected.description || /*#__PURE__*/React.createElement(Caption, null, "Not set.")
    }, {
      label: 'Counterparty',
      value: selected.counterpartyAccountId ? mono((accountOf(selected.counterpartyAccountId) || {}).accountNumber || selected.counterpartyAccountId) : /*#__PURE__*/React.createElement(Caption, null, "Not set.")
    }, {
      label: 'Counterparty ref.',
      value: selected.counterpartyReference ? mono(selected.counterpartyReference) : /*#__PURE__*/React.createElement(Caption, null, "Not set.")
    }, {
      label: 'Transaction group',
      value: selected.transactionGroupId ? mono(selected.transactionGroupId) : /*#__PURE__*/React.createElement(Caption, null, "Not set.")
    }, {
      label: 'External ref.',
      value: selected.externalReference ? mono(selected.externalReference) : /*#__PURE__*/React.createElement(Caption, null, "Not set.")
    }]
  }), selected.metadata.length ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(DetailSection, null, "Metadata"), /*#__PURE__*/React.createElement(MetadataEditor, {
    readOnly: true,
    entries: selected.metadata
  })) : null, selected.reversedBy || selected.reverses ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(DetailSection, null, "Reversal lineage"), /*#__PURE__*/React.createElement("div", {
    style: {
      borderLeft: '3px solid var(--primary)',
      paddingLeft: 'var(--space-3)',
      fontSize: 'var(--text-table-size)'
    }
  }, selected.reversedBy ? /*#__PURE__*/React.createElement(React.Fragment, null, "Reversed by ", /*#__PURE__*/React.createElement(Mono, null, selected.reversedBy), ". Both rows stay on the account; the balance reflects the pair.") : /*#__PURE__*/React.createElement(React.Fragment, null, "Reverses ", /*#__PURE__*/React.createElement(Mono, null, selected.reverses), ". This is the correcting entry, not a deletion."), selected.reversalReason ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-2)',
      color: 'var(--muted-foreground)'
    }
  }, "Reason: ", selected.reversalReason) : null)) : null, /*#__PURE__*/React.createElement(DetailSection, null, "Audit"), /*#__PURE__*/React.createElement(DetailList, {
    items: [{
      label: 'Recorded by',
      value: mono(selected.recordedBy)
    }, {
      label: 'Recorded',
      value: selected.recordedAt
    }]
  })) : draft ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '112px minmax(0, 1fr)',
      gap: 'var(--space-3) var(--space-4)',
      fontSize: 'var(--text-table-size)'
    }
  }, /*#__PURE__*/React.createElement(FormRow, {
    label: "Account",
    required: true,
    hint: draftAccount && draftAccount.status !== 'Active' ? draftAccount.accountNumber + ' is ' + draftAccount.status.toLowerCase() + '.' : 'The account fixes the currency and the floor this record is checked against.'
  }, /*#__PURE__*/React.createElement(Select, {
    options: [{
      value: '',
      label: 'Select an account'
    }].concat(ACCOUNTS.map(a => ({
      value: a.id,
      label: a.accountNumber + ' — ' + a.name
    }))),
    value: draft.accountId,
    onChange: e => set({
      accountId: e.target.value,
      currency: (accountOf(e.target.value) || {}).currency || ''
    }),
    style: {
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement(FormRow, {
    label: "Currency"
  }, /*#__PURE__*/React.createElement(ReadOnlyField, null, draftAccount ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Currency, {
    code: draftAccount.currency
  }), /*#__PURE__*/React.createElement(Caption, null, dec(draftAccount.currency), " dp"), /*#__PURE__*/React.createElement(Icon, {
    name: "lock",
    size: 13,
    style: {
      color: 'var(--muted-foreground)'
    }
  })) : /*#__PURE__*/React.createElement(Caption, null, "Taken from the account."))), /*#__PURE__*/React.createElement(FormRow, {
    label: "Direction",
    required: true,
    hint: draftAccount && draftAccount.status === 'Dormant' ? 'Debits are disabled: this account is dormant. A credit can still be recorded.' : null
  }, /*#__PURE__*/React.createElement(Select, {
    options: [{
      value: 'credit',
      label: 'Credit'
    }, {
      value: 'debit',
      label: 'Debit'
    }],
    value: draft.direction,
    onChange: e => set({
      direction: e.target.value
    }),
    style: {
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement(FormRow, {
    label: "Amount",
    required: true,
    hint: draftAccount ? 'Unsigned, at ' + dec(draftAccount.currency) + ' decimal places. Balance is now ' + Number(draftAccount.balance).toFixed(dec(draftAccount.currency)) + ' ' + draftAccount.currency + '.' : 'Unsigned — the direction carries the sign.'
  }, /*#__PURE__*/React.createElement(Input, {
    numeric: true,
    value: draft.amount,
    placeholder: "0.00",
    invalid: errors.some(e => e.code.indexOf('AMOUNT') > -1 || e.code === 'INSUFFICIENT_FUNDS'),
    onChange: e => set({
      amount: e.target.value
    }),
    style: {
      width: 168
    },
    "aria-label": "Amount"
  })), /*#__PURE__*/React.createElement(FormRow, {
    label: "Effective",
    hint: "Defaults to today. Future dates are blocked here rather than refused by the service."
  }, /*#__PURE__*/React.createElement(Input, {
    type: "date",
    value: draft.effectiveDate || '',
    max: TODAY,
    invalid: errors.some(e => e.code === 'EFFECTIVE_DATE_IN_FUTURE'),
    onChange: e => set({
      effectiveDate: e.target.value === '' ? null : e.target.value
    }),
    style: {
      width: 168
    },
    "aria-label": "Effective date"
  })), /*#__PURE__*/React.createElement(FormRow, {
    label: "Category",
    required: true
  }, /*#__PURE__*/React.createElement(Select, {
    options: CATEGORIES,
    value: draft.category,
    onChange: e => set({
      category: e.target.value
    }),
    style: {
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement(FormRow, {
    label: "Description",
    hint: "Optional. Sent as null when left empty."
  }, /*#__PURE__*/React.createElement(Textarea, {
    rows: 2,
    value: draft.description || '',
    placeholder: "What this record is for.",
    onChange: e => set({
      description: e.target.value === '' ? null : e.target.value
    })
  }))), /*#__PURE__*/React.createElement(DetailSection, null, "Counterparty and grouping"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '112px minmax(0, 1fr)',
      gap: 'var(--space-3) var(--space-4)',
      fontSize: 'var(--text-table-size)'
    }
  }, /*#__PURE__*/React.createElement(FormRow, {
    label: "Counterparty"
  }, /*#__PURE__*/React.createElement(Select, {
    options: [{
      value: '',
      label: 'None'
    }].concat(ACCOUNTS.filter(a => a.id !== draft.accountId).map(a => ({
      value: a.id,
      label: a.accountNumber
    }))),
    value: draft.counterpartyAccountId || '',
    onChange: e => set({
      counterpartyAccountId: e.target.value === '' ? null : e.target.value
    }),
    style: {
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement(FormRow, {
    label: "Counterparty ref.",
    hint: "The other side's own identifier, where there is no account in this ledger."
  }, /*#__PURE__*/React.createElement(Input, {
    mono: true,
    value: draft.counterpartyReference || '',
    placeholder: "swift:MT103-88213",
    onChange: e => set({
      counterpartyReference: e.target.value === '' ? null : e.target.value
    }),
    style: {
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement(FormRow, {
    label: "Transaction group",
    hint: "Ties records that move together. Left empty, this record stands alone."
  }, /*#__PURE__*/React.createElement(Input, {
    mono: true,
    value: draft.transactionGroupId || '',
    placeholder: "tgr_88f102",
    onChange: e => set({
      transactionGroupId: e.target.value === '' ? null : e.target.value
    }),
    style: {
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement(FormRow, {
    label: "External ref."
  }, /*#__PURE__*/React.createElement(Input, {
    mono: true,
    value: draft.externalReference || '',
    placeholder: "erp:pay-4471",
    onChange: e => set({
      externalReference: e.target.value === '' ? null : e.target.value
    }),
    style: {
      width: '100%'
    }
  }))), /*#__PURE__*/React.createElement(DetailSection, null, "Metadata"), /*#__PURE__*/React.createElement(MetadataEditor, {
    entries: draft.metadata,
    onChange: entries => set({
      metadata: entries
    })
  }), /*#__PURE__*/React.createElement(Note, {
    style: {
      marginTop: 'var(--space-3)'
    }
  }, "String keys and values only."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-5)'
    }
  }, /*#__PURE__*/React.createElement(IdempotencyKeyField, {
    value: idemKey
  })), /*#__PURE__*/React.createElement("div", {
    ref: errorRef
  }, errors.length ? /*#__PURE__*/React.createElement(RefusalAlert, {
    errors: errors,
    style: {
      marginTop: 'var(--space-4)'
    }
  }) : null)) : null);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(AppShell, {
    sidebar: /*#__PURE__*/React.createElement(Sidebar, {
      sections: NAV,
      active: "records"
    }),
    topbarRight: /*#__PURE__*/React.createElement(UserMenu, {
      name: "Steven Ho",
      email: "steven.ho@transwap.com",
      tenant: "Transwap",
      objectId: "8f2c41de-90a1-4c33-b0f2-77e5a1c9d412",
      scopes: ['accounts.read', 'accounts.write', 'postings.read', 'postings.write'],
      missingScopes: ['postings.reverse'],
      onSignOut: () => {}
    }),
    breadcrumb: /*#__PURE__*/React.createElement(Breadcrumb, {
      items: [{
        label: 'Ledger',
        href: '#'
      }, {
        label: 'Records'
      }]
    }),
    panel: panel,
    panelOpen: panelOpen,
    style: {
      minWidth: 1180
    }
  }, /*#__PURE__*/React.createElement(PageHeader, {
    icon: "file-text",
    title: "Records",
    description: "Every movement recorded against an account. A record is immutable once posted; a correction is an opposing record.",
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "download",
        size: 14
      }),
      onClick: () => setFlash({
        title: 'Export queued',
        text: rows.length + ' records will be written to CSV and mailed to you when ready.'
      })
    }, "Export"), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      icon: /*#__PURE__*/React.createElement(Icon, {
        name: "plus",
        size: 14
      }),
      onClick: openCreate
    }, "Record posting"))
  }), flash ? /*#__PURE__*/React.createElement(Card, {
    style: {
      borderLeft: '3px solid var(--credit)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(Label, null, flash.title), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      fontSize: 'var(--text-table-size)'
    }
  }, flash.text)), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "ghost",
    onClick: () => setFlash(null),
    style: {
      marginLeft: 'auto',
      color: 'var(--muted-foreground)'
    },
    "aria-label": "Dismiss"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 14
  }))) : null, /*#__PURE__*/React.createElement(Card, {
    padded: false
  }, /*#__PURE__*/React.createElement(CardBar, {
    position: "top"
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "Search record, account or reference",
    prefix: /*#__PURE__*/React.createElement(Icon, {
      name: "search",
      size: 14
    }),
    value: query,
    onChange: e => setQuery(e.target.value),
    style: {
      width: 256
    },
    "aria-label": "Search records"
  }), query ? /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "ghost",
    onClick: () => setQuery(''),
    style: {
      color: 'var(--muted-foreground)'
    }
  }, "Clear") : null, /*#__PURE__*/React.createElement(Caption, {
    style: {
      marginLeft: 'auto'
    }
  }, rows.length, " of ", records.length), /*#__PURE__*/React.createElement(FilterMenu, {
    activeCount: (period !== '30d' ? 1 : 0) + (directionFilter !== 'Any' ? 1 : 0) + (categoryFilter !== 'Any' ? 1 : 0) + (statusFilter !== 'Any' ? 1 : 0),
    onClear: () => {
      setPeriod('30d');
      setDirectionFilter('Any');
      setCategoryFilter('Any');
      setStatusFilter('Any');
    }
  }, /*#__PURE__*/React.createElement(FilterField, {
    label: "Period",
    hint: "Effective date. 90 days is the widest window."
  }, /*#__PURE__*/React.createElement(Select, {
    options: PERIODS,
    value: period,
    onChange: e => setPeriod(e.target.value),
    style: {
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement(FilterField, {
    label: "Direction"
  }, /*#__PURE__*/React.createElement(Select, {
    options: ['Any', 'credit', 'debit'],
    value: directionFilter,
    onChange: e => setDirectionFilter(e.target.value),
    style: {
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement(FilterField, {
    label: "Category"
  }, /*#__PURE__*/React.createElement(Select, {
    options: ['Any'].concat(CATEGORIES),
    value: categoryFilter,
    onChange: e => setCategoryFilter(e.target.value),
    style: {
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement(FilterField, {
    label: "Status"
  }, /*#__PURE__*/React.createElement(Select, {
    options: ['Any', 'Posted', 'Reversed'],
    value: statusFilter,
    onChange: e => setStatusFilter(e.target.value),
    style: {
      width: '100%'
    }
  })))), /*#__PURE__*/React.createElement(LedgerTable, {
    columns: columns,
    rows: visible,
    selectedId: selectedId,
    onSelectRow: r => mode === 'create' && dirty ? setDialog({
      kind: 'discard'
    }) : openView(r),
    orderBy: sort.field,
    desc: sort.desc,
    onSort: field => setSort(s => ({
      field,
      desc: s.field === field ? !s.desc : true
    })),
    emptyMessage: "No records match this filter."
  }), /*#__PURE__*/React.createElement(Pagination, {
    page: current,
    pageCount: pageCount,
    pageSize: pageSize,
    pageSizeOptions: [5, 10, 25, 50],
    onPageChange: setPage,
    onPageSizeChange: n => {
      setPageSize(n);
      setPage(1);
    }
  })), /*#__PURE__*/React.createElement(Note, null, "Amounts are shown at each currency's own precision and are never combined across currencies. ", /*#__PURE__*/React.createElement(Mono, null, "Balance after"), " is a property of one account's stream and appears on that account's statement, not in this cross-account list.")), dialog && dialog.kind === 'confirm' && draft && draftAccount ? /*#__PURE__*/React.createElement(ConfirmMovement, {
    open: true,
    direction: draft.direction === 'credit' ? 'Credit' : 'Debit',
    amount: draft.amount,
    currency: draftAccount.currency,
    decimalPlaces: dec(draftAccount.currency),
    accountNumber: draftAccount.accountNumber,
    accountName: draftAccount.name,
    effectiveDate: fmtDate(draft.effectiveDate),
    category: draft.category,
    consequence: "Posting is immediate and final. The record cannot be edited afterwards; a correction is recorded as an opposing record.",
    onBack: () => setDialog(null),
    onConfirm: record,
    confirmLabel: "Record posting"
  }) : null, dialog && dialog.kind === 'reverse-confirm' && dialog.record ? /*#__PURE__*/React.createElement(ConfirmMovement, {
    open: true,
    direction: dialog.record.direction === 'credit' ? 'Debit' : 'Credit',
    amount: dialog.record.amount,
    currency: dialog.record.currency,
    decimalPlaces: dec(dialog.record.currency),
    accountNumber: (accountOf(dialog.record.accountId) || {}).accountNumber,
    accountName: (accountOf(dialog.record.accountId) || {}).name,
    effectiveDate: fmtDate(dialog.record.effectiveDate),
    category: "reversal",
    consequence: /*#__PURE__*/React.createElement(React.Fragment, null, "A new opposing record is posted and ", /*#__PURE__*/React.createElement(Mono, null, dialog.record.recordNumber), " is marked Reversed. Nothing is erased \u2014 the account carries both rows. Reason: ", reason.trim()),
    onBack: () => setDialog({
      kind: 'reverse',
      record: dialog.record
    }),
    onConfirm: () => reverse(dialog.record, reason.trim()),
    confirmLabel: "Reverse record"
  }) : null, /*#__PURE__*/React.createElement(Dialog, {
    open: Boolean(dialog && dialog.kind === 'reverse'),
    tone: "destructive",
    title: "Reverse record",
    onClose: () => {
      setDialog(null);
      setReasonError(false);
    },
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      onClick: () => {
        setDialog(null);
        setReasonError(false);
      }
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      variant: "destructive",
      onClick: () => {
        if (!reason.trim()) {
          setReasonError(true);
          return;
        }
        setReasonError(false);
        setDialog({
          kind: 'reverse-confirm',
          record: dialog.record
        });
      }
    }, "Continue"))
  }, dialog && dialog.record ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", null, "Reversing ", /*#__PURE__*/React.createElement(Mono, null, dialog.record.recordNumber), " posts an opposing entry against ", /*#__PURE__*/React.createElement(Mono, null, (accountOf(dialog.record.accountId) || {}).accountNumber), ". Nothing is erased."), /*#__PURE__*/React.createElement(Caption, {
    style: {
      display: 'block',
      marginTop: 'var(--space-4)'
    }
  }, "Reason", /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      color: 'var(--destructive-solid)',
      marginLeft: 2
    }
  }, "*")), /*#__PURE__*/React.createElement(Textarea, {
    rows: 3,
    value: reason,
    invalid: reasonError,
    placeholder: "Why this record is being reversed.",
    onChange: e => {
      setReason(e.target.value);
      if (e.target.value.trim()) setReasonError(false);
    },
    style: {
      marginTop: 6
    }
  }), /*#__PURE__*/React.createElement(Note, {
    style: {
      marginTop: 'var(--space-3)'
    }
  }, "Required. Stored on both records and shown in the reversal lineage \u2014 this is the audit trail for the correction."), reasonError ? /*#__PURE__*/React.createElement(RefusalAlert, {
    errors: [{
      message: 'A reason is required to reverse a record.',
      code: 'REVERSAL_REASON_REQUIRED'
    }],
    style: {
      marginTop: 'var(--space-3)'
    }
  }) : null) : null), /*#__PURE__*/React.createElement(Dialog, {
    open: Boolean(dialog && dialog.kind === 'discard'),
    title: "Discard unsent record?",
    onClose: () => setDialog(null),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      onClick: () => setDialog(null)
    }, "Keep editing"), /*#__PURE__*/React.createElement(Button, {
      variant: "destructive",
      onClick: discard
    }, "Discard record"))
  }, "This record has not been sent. Closing the panel drops it, and the idempotency key is discarded with it."));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(RecordsScreen, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/records-crud/Records.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Breadcrumb = __ds_scope.Breadcrumb;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.CardBar = __ds_scope.CardBar;

__ds_ns.Chip = __ds_scope.Chip;

__ds_ns.ICON_PATHS = __ds_scope.ICON_PATHS;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.Label = __ds_scope.Label;

__ds_ns.Caption = __ds_scope.Caption;

__ds_ns.Note = __ds_scope.Note;

__ds_ns.Mono = __ds_scope.Mono;

__ds_ns.Pagination = __ds_scope.Pagination;

__ds_ns.Separator = __ds_scope.Separator;

__ds_ns.Skeleton = __ds_scope.Skeleton;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.ConfirmMovement = __ds_scope.ConfirmMovement;

__ds_ns.DetailPanel = __ds_scope.DetailPanel;

__ds_ns.DetailList = __ds_scope.DetailList;

__ds_ns.DetailSection = __ds_scope.DetailSection;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.RefusalAlert = __ds_scope.RefusalAlert;

__ds_ns.ScopeGate = __ds_scope.ScopeGate;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.DateRangeFilter = __ds_scope.DateRangeFilter;

__ds_ns.FilterField = __ds_scope.FilterField;

__ds_ns.FilterMenu = __ds_scope.FilterMenu;

__ds_ns.IdempotencyKeyField = __ds_scope.IdempotencyKeyField;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.ReadOnlyField = __ds_scope.ReadOnlyField;

__ds_ns.MetadataEditor = __ds_scope.MetadataEditor;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.AccountNumber = __ds_scope.AccountNumber;

__ds_ns.PostingNumber = __ds_scope.PostingNumber;

__ds_ns.BalanceTiles = __ds_scope.BalanceTiles;

__ds_ns.CURRENCY_COUNTRY = __ds_scope.CURRENCY_COUNTRY;

__ds_ns.Currency = __ds_scope.Currency;

__ds_ns.CurrencyBalanceList = __ds_scope.CurrencyBalanceList;

__ds_ns.FloorLine = __ds_scope.FloorLine;

__ds_ns.LedgerTable = __ds_scope.LedgerTable;

__ds_ns.Money = __ds_scope.Money;

__ds_ns.StatementTable = __ds_scope.StatementTable;

__ds_ns.STATUS_TONE = __ds_scope.STATUS_TONE;

__ds_ns.StatusBadge = __ds_scope.StatusBadge;

__ds_ns.AppShell = __ds_scope.AppShell;

__ds_ns.PageHeader = __ds_scope.PageHeader;

__ds_ns.CONSOLE_NAV = __ds_scope.CONSOLE_NAV;

__ds_ns.BRAND_MARK = __ds_scope.BRAND_MARK;

__ds_ns.Sidebar = __ds_scope.Sidebar;

__ds_ns.UserMenu = __ds_scope.UserMenu;

})();
