import { render, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Pagination } from './Pagination';

describe('Pagination', () => {
  it('shows the current range and total', () => {
    const { container } = render(
      <Pagination
        meta={{ page: 2, limit: 20, total: 45, totalPages: 3 }}
        onPageChange={() => {}}
      />,
    );
    expect(within(container).getByText('21–40 of 45')).toBeInTheDocument();
  });

  it('shows the page position', () => {
    const { container } = render(
      <Pagination
        meta={{ page: 2, limit: 20, total: 45, totalPages: 3 }}
        onPageChange={() => {}}
      />,
    );
    expect(within(container).getByText('Page 2 of 3')).toBeInTheDocument();
  });

  it('disables Previous on the first page', () => {
    const { container } = render(
      <Pagination
        meta={{ page: 1, limit: 20, total: 45, totalPages: 3 }}
        onPageChange={() => {}}
      />,
    );
    expect(
      within(container).getByRole('button', { name: 'Previous' }),
    ).toBeDisabled();
    expect(
      within(container).getByRole('button', { name: 'Next' }),
    ).toBeEnabled();
  });

  it('disables Next on the last page', () => {
    const { container } = render(
      <Pagination
        meta={{ page: 3, limit: 20, total: 45, totalPages: 3 }}
        onPageChange={() => {}}
      />,
    );
    expect(
      within(container).getByRole('button', { name: 'Next' }),
    ).toBeDisabled();
    expect(
      within(container).getByRole('button', { name: 'Previous' }),
    ).toBeEnabled();
  });

  it('calls onPageChange with page - 1 when Previous is clicked', () => {
    const onPageChange = vi.fn();
    const { container } = render(
      <Pagination
        meta={{ page: 2, limit: 20, total: 45, totalPages: 3 }}
        onPageChange={onPageChange}
      />,
    );
    within(container).getByRole('button', { name: 'Previous' }).click();
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('calls onPageChange with page + 1 when Next is clicked', () => {
    const onPageChange = vi.fn();
    const { container } = render(
      <Pagination
        meta={{ page: 2, limit: 20, total: 45, totalPages: 3 }}
        onPageChange={onPageChange}
      />,
    );
    within(container).getByRole('button', { name: 'Next' }).click();
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('shows "No results" and disables both buttons when total is 0', () => {
    const { container } = render(
      <Pagination
        meta={{ page: 1, limit: 20, total: 0, totalPages: 0 }}
        onPageChange={() => {}}
      />,
    );
    expect(within(container).getByText('No results')).toBeInTheDocument();
    expect(within(container).getByText('Page 1 of 1')).toBeInTheDocument();
    expect(
      within(container).getByRole('button', { name: 'Previous' }),
    ).toBeDisabled();
    expect(
      within(container).getByRole('button', { name: 'Next' }),
    ).toBeDisabled();
  });

  it('is wrapped in a labeled navigation landmark', () => {
    const { container } = render(
      <Pagination
        meta={{ page: 1, limit: 20, total: 45, totalPages: 3 }}
        onPageChange={() => {}}
      />,
    );
    expect(
      within(container).getByRole('navigation', { name: 'Pagination' }),
    ).toBeInTheDocument();
  });

  it('merges a custom className', () => {
    const { container } = render(
      <Pagination
        meta={{ page: 1, limit: 20, total: 45, totalPages: 3 }}
        onPageChange={() => {}}
        className="custom-class"
      />,
    );
    expect(within(container).getByRole('navigation').className).toContain(
      'custom-class',
    );
  });
});
