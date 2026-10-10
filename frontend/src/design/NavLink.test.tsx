import type { ReactElement } from 'react';
import { render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { NavLink } from './NavLink';

function renderNav(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('NavLink', () => {
  it('renders an anchor pointing at "to", with uppercase label styling', () => {
    const { container } = renderNav(<NavLink to="/assets">Assets</NavLink>);
    const el = within(container).getByText('Assets');
    expect(el.tagName).toBe('A');
    expect(el).toHaveAttribute('href', '/assets');
    expect(el.className).toContain('uppercase');
    expect(el.className).toContain('text-label');
  });

  it('defaults to inactive: silver text, no aria-current', () => {
    const { container } = renderNav(<NavLink to="/assets">Assets</NavLink>);
    const el = within(container).getByText('Assets');
    expect(el.className).toContain('text-text-silver');
    expect(el).not.toHaveAttribute('aria-current');
  });

  it('applies the active state: platinum (white) text and aria-current="page"', () => {
    const { container } = renderNav(
      <NavLink to="/assets" active>
        Assets
      </NavLink>,
    );
    const el = within(container).getByText('Assets');
    expect(el.className).toContain('text-text-platinum');
    expect(el.className).not.toContain('text-text-silver');
    expect(el).toHaveAttribute('aria-current', 'page');
  });

  it('merges a custom className alongside the generated classes', () => {
    const { container } = renderNav(
      <NavLink to="/assets" className="custom-class">
        Assets
      </NavLink>,
    );
    const el = within(container).getByText('Assets');
    expect(el.className).toContain('custom-class');
    expect(el.className).toContain('text-label');
  });

  it('forwards other Link props, such as a target', () => {
    const { container } = renderNav(
      <NavLink to="/assets" target="_blank">
        Assets
      </NavLink>,
    );
    expect(within(container).getByText('Assets')).toHaveAttribute(
      'target',
      '_blank',
    );
  });
});
