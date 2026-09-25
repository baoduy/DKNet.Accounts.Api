import { render } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  it('renders a static placeholder block, hidden from assistive technology, that forwards a custom className', () => {
    const { container } = render(createElement(Skeleton, { className: 'h-4 w-24' }));
    const skeleton = container.querySelector('[data-slot="skeleton"]');
    expect(skeleton).toHaveClass('h-4', 'w-24', 'bg-muted');
    // No pulse or shimmer: the design draws placeholders still (Design/components/core/Skeleton.prompt.md).
    expect(skeleton).not.toHaveClass('animate-pulse');
    expect(skeleton).toHaveAttribute('aria-hidden', 'true');
  });
});
