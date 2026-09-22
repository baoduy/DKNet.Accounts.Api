import React from 'react';

/**
 * Disables children and states the required scope. Hiding an action the user cannot
 * perform is a courtesy; refusing it server-side is the control. A missing button is
 * indistinguishable from a bug, so this disables rather than hides.
 */
export function ScopeGate({ scope, granted = false, reason, children, style, ...rest }) {
  if (granted) return <>{children}</>;
  // Pass `disabled` down rather than fading a wrapper: the child then uses the
  // disabled tokens and its label stays readable, which is the whole point of
  // showing a refused action instead of hiding it.
  const refused = React.Children.map(children, (child) => (
    React.isValidElement(child) ? React.cloneElement(child, { disabled: true }) : child
  ));
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', ...style }} {...rest}>
      <span aria-disabled="true">{refused}</span>
      <span style={{ fontSize: 'var(--text-caption-size)', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
        {reason || <>requires <span style={{ fontFamily: 'var(--font-mono)' }}>{scope}</span></>}
      </span>
    </span>
  );
}
