import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('renders the title', () => {
    render(createElement(PageHeader, { title: 'Console' }));
    expect(screen.getByRole('heading', { name: 'Console' })).toBeInTheDocument();
  });

  it('renders an icon, meta, description and actions when given', () => {
    render(
      createElement(PageHeader, {
        icon: 'layout-dashboard',
        title: 'Overview',
        meta: 'meta content',
        description: 'a description',
        actions: 'an action',
      }),
    );
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByText('meta content')).toBeInTheDocument();
    expect(screen.getByText('a description')).toBeInTheDocument();
    expect(screen.getByText('an action')).toBeInTheDocument();
  });
});
