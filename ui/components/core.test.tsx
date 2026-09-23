import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { Button, Caption, Chip, Icon, Label, Mono, Note, Separator } from './core';

describe('core primitives', () => {
  it('Icon renders a known glyph and returns null for an unknown one', () => {
    const { container } = render(createElement(Icon, { name: 'chevron-down' }));
    expect(container.querySelector('svg')).toBeTruthy();
    const { container: empty } = render(createElement(Icon, { name: 'not-a-real-icon' }));
    expect(empty.innerHTML).toBe('');
  });

  it('Label/Caption/Note/Mono render their children', () => {
    render(createElement(Label, {}, 'Signed in'));
    render(createElement(Caption, {}, 'a caption'));
    render(createElement(Note, {}, 'a note'));
    render(createElement(Mono, {}, 'a mono value'));
    expect(screen.getByText('Signed in')).toBeInTheDocument();
    expect(screen.getByText('a caption')).toBeInTheDocument();
    expect(screen.getByText('a note')).toBeInTheDocument();
    expect(screen.getByText('a mono value')).toBeInTheDocument();
  });

  it('Chip renders selected and unselected states', () => {
    render(createElement(Chip, { selected: true }, 'accounts.read'));
    render(createElement(Chip, {}, 'postings.reverse'));
    expect(screen.getByText('accounts.read')).toBeInTheDocument();
    expect(screen.getByText('postings.reverse')).toBeInTheDocument();
  });

  it('Separator renders a horizontal rule role', () => {
    render(createElement(Separator, {}));
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('Button renders every variant and size without throwing', () => {
    for (const variant of ['default', 'primary', 'ghost', 'destructive'] as const) {
      for (const size of ['sm', 'md', 'lg'] as const) {
        render(createElement(Button, { variant, size }, `${variant}-${size}`));
      }
    }
    expect(screen.getByText('primary-lg')).toBeInTheDocument();
  });
});
