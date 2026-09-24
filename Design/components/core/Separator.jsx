import React from 'react';

export function Separator({ orientation = 'horizontal', style, ...rest }) {
  return (
    <div role="separator" aria-orientation={orientation} style={orientation === 'vertical'
      ? { width: 1, alignSelf: 'stretch', background: 'var(--border)', ...style }
      : { height: 1, width: '100%', background: 'var(--border)', ...style }} {...rest} />
  );
}
