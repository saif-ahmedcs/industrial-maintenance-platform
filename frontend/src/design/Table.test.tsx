import { fireEvent, render, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Table, type TableColumn } from './Table';

interface Row {
  id: string;
  tag: string;
  quantity: number;
}

const columns: TableColumn<Row>[] = [
  { key: 'tag', header: 'Tag' },
  { key: 'quantity', header: 'Quantity', align: 'right' },
];

const rows: Row[] = [
  { id: '1', tag: 'PUMP-01', quantity: 4 },
  { id: '2', tag: 'MOTOR-01', quantity: 12 },
];

describe('Table', () => {
  it('renders column headers as th scope="col"', () => {
    const { container } = render(
      <Table columns={columns} rows={rows} rowKey={(row) => row.id} />,
    );
    const headers = container.querySelectorAll('th');
    expect(headers).toHaveLength(2);
    headers.forEach((th) => expect(th).toHaveAttribute('scope', 'col'));
    expect(within(container).getByText('Tag')).toBeInTheDocument();
    expect(within(container).getByText('Quantity')).toBeInTheDocument();
  });

  it('renders each row value by column key when no render function is given', () => {
    const { container } = render(
      <Table columns={columns} rows={rows} rowKey={(row) => row.id} />,
    );
    expect(within(container).getByText('PUMP-01')).toBeInTheDocument();
    expect(within(container).getByText('12')).toBeInTheDocument();
  });

  it('uses a column render function for custom cell content', () => {
    const customColumns: TableColumn<Row>[] = [
      {
        key: 'tag',
        header: 'Tag',
        render: (row) => <strong>{row.tag.toLowerCase()}</strong>,
      },
    ];
    const { container } = render(
      <Table columns={customColumns} rows={rows} rowKey={(row) => row.id} />,
    );
    expect(within(container).getByText('pump-01').tagName).toBe('STRONG');
  });

  it('right-aligns a column marked align="right"', () => {
    const { container } = render(
      <Table columns={columns} rows={rows} rowKey={(row) => row.id} />,
    );
    const quantityHeader = within(container).getByText('Quantity');
    expect(quantityHeader.className).toContain('text-right');
    const quantityCell = within(container).getByText('12');
    expect(quantityCell.className).toContain('text-right');
    expect(quantityCell.className).toContain('tabular-nums');
  });

  it('shows the empty content when there are no rows and it is not loading', () => {
    const { container } = render(
      <Table
        columns={columns}
        rows={[]}
        empty="No open work orders. Create one from an asset page."
      />,
    );
    expect(
      within(container).getByText(
        'No open work orders. Create one from an asset page.',
      ),
    ).toBeInTheDocument();
  });

  it('shows skeleton placeholder rows when loading, not the empty content', () => {
    const { container } = render(
      <Table columns={columns} rows={[]} loading empty="No rows." />,
    );
    expect(within(container).queryByText('No rows.')).not.toBeInTheDocument();
    const placeholders = container.querySelectorAll('[aria-hidden="true"]');
    expect(placeholders.length).toBeGreaterThan(0);
  });

  it('shows skeleton rows over real rows while loading', () => {
    const { container } = render(
      <Table
        columns={columns}
        rows={rows}
        loading
        rowKey={(row) => row.id}
      />,
    );
    expect(within(container).queryByText('PUMP-01')).not.toBeInTheDocument();
  });

  it('calls onRowClick with the row when a row is clicked', () => {
    const onRowClick = vi.fn();
    const { container } = render(
      <Table
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        onRowClick={onRowClick}
      />,
    );
    within(container).getByText('PUMP-01').closest('tr')?.click();
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });

  it('calls onRowClick on Enter, for keyboard operability', () => {
    const onRowClick = vi.fn();
    const { container } = render(
      <Table
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        onRowClick={onRowClick}
      />,
    );
    const row = within(container).getByText('PUMP-01').closest('tr')!;
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });

  it('makes rows focusable only when onRowClick is provided', () => {
    const { container: withHandler } = render(
      <Table
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        onRowClick={() => {}}
      />,
    );
    expect(
      within(withHandler).getByText('PUMP-01').closest('tr'),
    ).toHaveAttribute('tabIndex', '0');

    const { container: withoutHandler } = render(
      <Table columns={columns} rows={rows} rowKey={(row) => row.id} />,
    );
    expect(
      within(withoutHandler).getByText('PUMP-01').closest('tr'),
    ).not.toHaveAttribute('tabIndex');
  });

  it('merges a custom className onto the wrapper', () => {
    const { container } = render(
      <Table
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        className="custom-class"
      />,
    );
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});
