import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { Dialog, DialogContent, DialogFooter, DialogTitle } from './dialog';

describe('Dialog', () => {
  it('renders its content, title and footer with their expected classes', () => {
    render(
      createElement(
        Dialog,
        { open: true },
        createElement(
          DialogContent,
          { className: 'extra' },
          createElement(DialogTitle, null, 'Confirm'),
          createElement(DialogFooter, { className: 'extra-footer' }, 'buttons'),
        ),
      ),
    );

    const title = screen.getByText('Confirm');
    expect(title).toHaveClass('font-semibold', 'text-foreground');

    const content = title.closest('[data-slot="dialog-content"]');
    expect(content).toHaveClass('fixed', 'flex', 'flex-col', 'rounded-xl', 'extra');

    const footer = screen.getByText('buttons');
    expect(footer).toHaveClass('flex', 'items-center', 'justify-end', 'extra-footer');
  });
});
