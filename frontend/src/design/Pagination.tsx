import { Button } from './Button';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ meta, onPageChange, className }: PaginationProps) {
  const { page, limit, total, totalPages } = meta;

  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, total);

  const classes = [
    'flex',
    'flex-wrap',
    'items-center',
    'justify-between',
    'gap-4',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <nav aria-label="Pagination" className={classes}>
      <p className="font-ui text-ui text-text-silver">
        {total === 0 ? 'No results' : `${rangeStart}–${rangeEnd} of ${total}`}
      </p>
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrevious}
        >
          Previous
        </Button>
        <span className="font-ui text-ui text-text-silver">
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <Button
          variant="ghost"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNext}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
