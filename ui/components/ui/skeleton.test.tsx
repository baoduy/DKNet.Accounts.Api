import { render } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  it('renders a placeholder block that forwards a custom className', () => {
    const { container } = render(createElement(Skeleton, { className: 'h-4 w-24' }));
    expect(container.querySelector('[data-slot="skeleton"]')).toHaveClass('h-4', 'w-24', 'animate-pulse');
  });
});
