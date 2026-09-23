import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { Separator } from './separator';

describe('Separator', () => {
  it('renders a horizontal separator by default, decorative (no separator role)', () => {
    const { container } = render(createElement(Separator, {}));
    expect(container.querySelector('[data-slot="separator"]')).toHaveAttribute('data-orientation', 'horizontal');
    expect(screen.queryByRole('separator')).toBeNull();
  });

  it('renders a vertical separator with a separator role when not decorative', () => {
    render(createElement(Separator, { orientation: 'vertical', decorative: false }));
    expect(screen.getByRole('separator')).toHaveAttribute('data-orientation', 'vertical');
  });
});
