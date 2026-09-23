import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { Button } from './button';

describe('Button', () => {
  it('renders as a native button by default', () => {
    render(createElement(Button, {}, 'Save'));
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('renders every variant and size without throwing, applying a distinct class per variant', () => {
    const classesByVariant = new Set<string>();
    for (const variant of ['default', 'primary', 'ghost', 'destructive'] as const) {
      for (const size of ['sm', 'md', 'lg'] as const) {
        const { unmount } = render(createElement(Button, { variant, size }, `${variant}-${size}`));
        classesByVariant.add(screen.getByText(`${variant}-${size}`).className);
        unmount();
      }
    }
    expect(classesByVariant.size).toBeGreaterThan(1);
  });

  it('renders its child element instead of a button when asChild is set', () => {
    render(createElement(Button, { asChild: true }, createElement('a', { href: '/x' }, 'Go')));
    expect(screen.getByRole('link', { name: 'Go' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
