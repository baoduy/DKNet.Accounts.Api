import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

describe('Tooltip', () => {
  it('shows its content on hover', async () => {
    const user = userEvent.setup();
    render(
      createElement(
        Tooltip,
        {},
        createElement(TooltipTrigger, {}, 'Hover me'),
        createElement(TooltipContent, {}, 'Helpful hint'),
      ),
    );
    expect(screen.queryByText('Helpful hint')).toBeNull();
    await user.hover(screen.getByText('Hover me'));
    expect(await screen.findByText('Helpful hint')).toBeInTheDocument();
  });
});
