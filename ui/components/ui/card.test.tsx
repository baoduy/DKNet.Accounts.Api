import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';

describe('Card', () => {
  it('renders its parts and forwards a custom className onto the root', () => {
    const { container } = render(
      createElement(
        Card,
        { className: 'extra-class' },
        createElement(CardHeader, {}, createElement(CardTitle, {}, 'Title'), createElement(CardDescription, {}, 'Description')),
        createElement(CardContent, {}, 'Body'),
        createElement(CardFooter, {}, 'Footer'),
      ),
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="card"]')).toHaveClass('extra-class');
  });
});
