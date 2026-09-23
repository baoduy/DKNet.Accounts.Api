import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

describe('Table', () => {
  it('renders a table with a header row and a body row', () => {
    render(
      createElement(
        Table,
        {},
        createElement(TableHeader, {}, createElement(TableRow, {}, createElement(TableHead, {}, 'Name'))),
        createElement(TableBody, {}, createElement(TableRow, {}, createElement(TableCell, {}, 'Mai Nguyen'))),
      ),
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Mai Nguyen' })).toBeInTheDocument();
  });
});
