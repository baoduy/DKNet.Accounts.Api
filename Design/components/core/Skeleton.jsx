import React from 'react';

export function Skeleton({ width = '100%', height = 32, radius = 'var(--radius-sm)', style, ...rest }) {
  return <div aria-hidden="true" style={{ width, height, background: 'var(--muted)', borderRadius: radius, ...style }} {...rest} />;
}
