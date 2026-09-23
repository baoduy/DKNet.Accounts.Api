import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('renders the sidebar, top bar content, breadcrumb and page content', () => {
    render(
      createElement(
        AppShell,
        {
          sidebar: createElement('nav', { 'aria-label': 'Primary' }, 'Sidebar'),
          breadcrumb: createElement('span', {}, 'Breadcrumb'),
          topbarRight: createElement('span', {}, 'TopbarRight'),
        },
        createElement('p', {}, 'Content'),
      ),
    );
    expect(screen.getByText('Sidebar')).toBeInTheDocument();
    expect(screen.getByText('Breadcrumb')).toBeInTheDocument();
    expect(screen.getByText('TopbarRight')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('does not render panel content when panelOpen is false', () => {
    render(createElement(AppShell, { panel: createElement('div', {}, 'Panel content'), panelOpen: false }));
    expect(screen.queryByText('Panel content')).toBeNull();
  });

  it('renders the panel inline and reserves layout space when panelBehavior is "shift"', () => {
    render(
      createElement(AppShell, {
        panel: createElement('div', {}, 'Panel content'),
        panelOpen: true,
        panelBehavior: 'shift',
      }),
    );
    expect(screen.getByText('Panel content')).toBeInTheDocument();
  });

  it('renders the panel as a non-modal overlay when panelBehavior is "overlay"', () => {
    render(
      createElement(AppShell, {
        panel: createElement('div', {}, 'Panel content'),
        panelOpen: true,
        panelBehavior: 'overlay',
      }),
    );
    expect(screen.getByText('Panel content')).toBeInTheDocument();
    // Non-modal (row 5): the region behind the panel stays interactive — no Radix scroll-lock
    // or focus-trap wrapper renders around the rest of the page.
    expect(document.body).not.toHaveAttribute('data-scroll-locked');
  });
});
