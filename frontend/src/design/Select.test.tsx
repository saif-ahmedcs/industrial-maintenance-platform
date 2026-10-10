import { fireEvent, render, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Select, type SelectOption } from './Select';

const options: SelectOption[] = [
  { value: 'pump', label: 'Pump' },
  { value: 'motor', label: 'Motor' },
  { value: 'valve', label: 'Valve' },
];

describe('Select (native mode)', () => {
  it('renders every option', () => {
    const { container } = render(
      <Select options={options} value="pump" onChange={() => {}} />,
    );
    const select = container.querySelector('select')!;
    expect(within(select).getAllByRole('option')).toHaveLength(3);
  });

  it('reflects the current value', () => {
    const { container } = render(
      <Select options={options} value="motor" onChange={() => {}} />,
    );
    expect(container.querySelector('select')).toHaveValue('motor');
  });

  it('calls onChange with the new value when an option is picked', () => {
    const onChange = vi.fn();
    const { container } = render(
      <Select options={options} value="pump" onChange={onChange} />,
    );
    fireEvent.change(container.querySelector('select')!, {
      target: { value: 'valve' },
    });
    expect(onChange).toHaveBeenCalledWith('valve');
  });

  it('adds a disabled placeholder option when given', () => {
    const { container } = render(
      <Select
        options={options}
        value=""
        onChange={() => {}}
        placeholder="Select an asset"
      />,
    );
    const placeholderOption = within(
      container.querySelector('select')!,
    ).getByText('Select an asset');
    expect(placeholderOption).toHaveAttribute('disabled');
  });

  it('shows the error text in Lavender Phosphor and marks aria-invalid', () => {
    const { container } = render(
      <Select
        options={options}
        value="pump"
        onChange={() => {}}
        error="An asset is required"
      />,
    );
    const error = within(container).getByText('An asset is required');
    expect(error.className).toContain('text-accent-lavender');
    expect(container.querySelector('select')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('disables the control when disabled is passed', () => {
    const { container } = render(
      <Select options={options} value="pump" onChange={() => {}} disabled />,
    );
    expect(container.querySelector('select')).toBeDisabled();
  });

  it('merges a custom className onto the control', () => {
    const { container } = render(
      <Select
        options={options}
        value="pump"
        onChange={() => {}}
        className="custom-class"
      />,
    );
    expect(container.querySelector('select')?.className).toContain(
      'custom-class',
    );
  });
});

describe('Select (searchable mode)', () => {
  it('shows the selected option label when closed', () => {
    const { container } = render(
      <Select options={options} value="motor" onChange={() => {}} searchable />,
    );
    expect(within(container).getByRole('combobox')).toHaveValue('Motor');
  });

  it('opens the listbox on focus and lists every option', () => {
    const { container } = render(
      <Select options={options} value="pump" onChange={() => {}} searchable />,
    );
    fireEvent.focus(within(container).getByRole('combobox'));
    expect(within(container).getByRole('listbox')).toBeInTheDocument();
    expect(within(container).getAllByRole('option')).toHaveLength(3);
  });

  it('filters options by typed text', () => {
    const { container } = render(
      <Select options={options} value="pump" onChange={() => {}} searchable />,
    );
    const input = within(container).getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'mo' } });
    expect(within(container).getAllByRole('option')).toHaveLength(1);
    expect(within(container).getByText('Motor')).toBeInTheDocument();
  });

  it('shows "No matches" when nothing filters in', () => {
    const { container } = render(
      <Select options={options} value="pump" onChange={() => {}} searchable />,
    );
    const input = within(container).getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'zzz' } });
    expect(within(container).getByText('No matches')).toBeInTheDocument();
  });

  it('calls onChange and closes the listbox when an option is clicked', () => {
    const onChange = vi.fn();
    const { container } = render(
      <Select options={options} value="pump" onChange={onChange} searchable />,
    );
    fireEvent.focus(within(container).getByRole('combobox'));
    fireEvent.click(within(container).getByText('Valve'));
    expect(onChange).toHaveBeenCalledWith('valve');
    expect(within(container).queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('moves the highlight with arrow keys and selects it with Enter', () => {
    const onChange = vi.fn();
    const { container } = render(
      <Select options={options} value="pump" onChange={onChange} searchable />,
    );
    const input = within(container).getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' }); // Pump -> Motor
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('motor');
  });

  it('closes on Escape without changing the value', () => {
    const onChange = vi.fn();
    const { container } = render(
      <Select options={options} value="pump" onChange={onChange} searchable />,
    );
    const input = within(container).getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(within(container).queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('closes on blur and reverts the display to the selected label', () => {
    const { container } = render(
      <Select options={options} value="pump" onChange={() => {}} searchable />,
    );
    const input = within(container).getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'mo' } });
    fireEvent.blur(input);
    expect(within(container).queryByRole('listbox')).not.toBeInTheDocument();
    expect(input).toHaveValue('Pump');
  });

  it('shows the error text and marks aria-invalid', () => {
    const { container } = render(
      <Select
        options={options}
        value="pump"
        onChange={() => {}}
        searchable
        error="An asset is required"
      />,
    );
    const error = within(container).getByText('An asset is required');
    expect(error.className).toContain('text-accent-lavender');
    expect(within(container).getByRole('combobox')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('merges a custom className onto the input', () => {
    const { container } = render(
      <Select
        options={options}
        value="pump"
        onChange={() => {}}
        searchable
        className="custom-class"
      />,
    );
    expect(within(container).getByRole('combobox').className).toContain(
      'custom-class',
    );
  });
});
