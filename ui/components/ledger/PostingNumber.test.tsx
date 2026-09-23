import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { PostingNumber } from './AccountNumber';

describe('PostingNumber', () => {
  it('renders the value with no reversed badge by default', () => {
    render(createElement(PostingNumber, { value: 'PST-000001' }));
    expect(screen.getByText('PST-000001')).toBeInTheDocument();
    expect(screen.queryByText('Reversed')).toBeNull();
  });

  it('pairs the value with a Reversed status badge when reversed', () => {
    render(createElement(PostingNumber, { value: 'PST-000001', reversed: true }));
    expect(screen.getByText('PST-000001')).toBeInTheDocument();
    expect(screen.getByText('Reversed')).toBeInTheDocument();
  });
});
