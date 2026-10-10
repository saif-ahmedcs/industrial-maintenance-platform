import { render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Field } from './Field';

describe('Field', () => {
  it('associates the label with the input via htmlFor/id', () => {
    const { container } = render(
      <Field label="Email">
        <input type="email" />
      </Field>,
    );
    const input = within(container).getByLabelText('Email');
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe('INPUT');
  });

  it('preserves an explicit id passed on the child input', () => {
    const { container } = render(
      <Field label="Email">
        <input type="email" id="login-email" />
      </Field>,
    );
    const input = within(container).getByLabelText('Email');
    expect(input).toHaveAttribute('id', 'login-email');
  });

  it('renders the hint below the field and wires it via aria-describedby', () => {
    const { container } = render(
      <Field label="Interval" hint="Days between scheduled visits">
        <input type="number" />
      </Field>,
    );
    const input = within(container).getByLabelText('Interval');
    const hint = within(container).getByText('Days between scheduled visits');
    expect(input.getAttribute('aria-describedby')).toBe(hint.id);
  });

  it('renders the error in Lavender Phosphor and wires it via aria-describedby', () => {
    const { container } = render(
      <Field label="Interval" error="Interval must be at least 1 day">
        <input type="number" />
      </Field>,
    );
    const input = within(container).getByLabelText('Interval');
    const error = within(container).getByText(
      'Interval must be at least 1 day',
    );
    expect(error.className).toContain('text-accent-lavender');
    expect(input.getAttribute('aria-describedby')).toBe(error.id);
  });

  it('marks the input aria-invalid when an error is present', () => {
    const { container } = render(
      <Field label="Interval" error="Interval must be at least 1 day">
        <input type="number" />
      </Field>,
    );
    expect(within(container).getByLabelText('Interval')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('does not mark the input invalid when there is no error', () => {
    const { container } = render(
      <Field label="Interval">
        <input type="number" />
      </Field>,
    );
    expect(
      within(container).getByLabelText('Interval'),
    ).not.toHaveAttribute('aria-invalid');
  });

  it('shows the error instead of the hint when both are given', () => {
    const { container } = render(
      <Field
        label="Interval"
        hint="Days between scheduled visits"
        error="Interval must be at least 1 day"
      >
        <input type="number" />
      </Field>,
    );
    const scope = within(container);
    expect(
      scope.getByText('Interval must be at least 1 day'),
    ).toBeInTheDocument();
    expect(
      scope.queryByText('Days between scheduled visits'),
    ).not.toBeInTheDocument();
  });

  it('applies the spec field styling to the input (Liquid Kelp, 6px radius, Slate Deep border)', () => {
    const { container } = render(
      <Field label="Email">
        <input type="email" />
      </Field>,
    );
    const input = within(container).getByLabelText('Email');
    expect(input.className).toContain('bg-surface-kelp');
    expect(input.className).toContain('rounded-small');
    expect(input.className).toContain('border-surface-slate');
    expect(input.className).toContain('text-text-platinum');
    expect(input.className).toContain('font-ui');
    expect(input.className).toContain('text-ui');
  });

  it('merges a className already on the child input', () => {
    const { container } = render(
      <Field label="Email">
        <input type="email" className="custom-input" />
      </Field>,
    );
    const input = within(container).getByLabelText('Email');
    expect(input.className).toContain('custom-input');
    expect(input.className).toContain('bg-surface-kelp');
  });

  it('forwards other native input props untouched', () => {
    const { container } = render(
      <Field label="Email">
        <input type="email" placeholder="you@example.com" autoComplete="email" />
      </Field>,
    );
    const input = within(container).getByLabelText('Email');
    expect(input).toHaveAttribute('placeholder', 'you@example.com');
    expect(input).toHaveAttribute('autocomplete', 'email');
  });

  it('merges a custom className on the wrapper', () => {
    const { container } = render(
      <Field label="Email" className="custom-wrapper">
        <input type="email" />
      </Field>,
    );
    expect(container.firstElementChild?.className).toContain(
      'custom-wrapper',
    );
  });
});
