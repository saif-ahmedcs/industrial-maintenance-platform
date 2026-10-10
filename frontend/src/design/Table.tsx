import type { ReactNode } from 'react';
import { Surface } from './Surface';

export interface TableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  render?: (row: T) => ReactNode;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  empty?: ReactNode;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  rowKey?: (row: T, index: number) => string | number;
  className?: string;
}

const CELL_PADDING = 'p-4'; // 16px, per DESIGN.md Data Table

const HEADER_CLASSES = [
  'font-ui',
  'text-ui',
  'uppercase',
  'tracking-[0.08em]',
  'text-text-silver',
].join(' ');

const VALUE_CLASSES = [
  'font-display',
  'text-body',
  'font-normal',
  'text-text-platinum',
].join(' ');

const LOADING_ROW_COUNT = 5;

function alignClasses(align: TableColumn<unknown>['align']) {
  return align === 'right' ? 'text-right tabular-nums' : 'text-left';
}

export function Table<T>({
  columns,
  rows,
  empty,
  loading = false,
  onRowClick,
  rowKey,
  className,
}: TableProps<T>) {
  const wrapperClasses = ['overflow-hidden', className]
    .filter(Boolean)
    .join(' ');

  const clickable = Boolean(onRowClick);

  return (
    <Surface tone="kelp" padding="none" className={wrapperClasses}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-surface-abyss">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={[
                  CELL_PADDING,
                  HEADER_CLASSES,
                  alignClasses(column.align),
                ].join(' ')}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: LOADING_ROW_COUNT }).map((_, rowIndex) => (
              <tr
                key={`skeleton-${rowIndex}`}
                className="border-b border-surface-abyss last:border-b-0"
              >
                {columns.map((column) => (
                  <td key={column.key} className={CELL_PADDING}>
                    <div
                      className="h-4 w-full max-w-32 animate-pulse rounded-small bg-surface-abyss"
                      aria-hidden="true"
                    />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className={[CELL_PADDING, 'text-center'].join(' ')}
              >
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => {
              const key = rowKey ? rowKey(row, index) : index;
              return (
                <tr
                  key={key}
                  className={[
                    'border-b',
                    'border-surface-abyss',
                    'last:border-b-0',
                    clickable
                      ? 'cursor-pointer hover:bg-surface-abyss focus-visible:bg-surface-abyss'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  tabIndex={clickable ? 0 : undefined}
                  onClick={clickable ? () => onRowClick?.(row) : undefined}
                  onKeyDown={
                    clickable
                      ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onRowClick?.(row);
                          }
                        }
                      : undefined
                  }
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={[
                        CELL_PADDING,
                        VALUE_CLASSES,
                        alignClasses(column.align),
                      ].join(' ')}
                    >
                      {column.render
                        ? column.render(row)
                        : String(
                            (row as Record<string, unknown>)[column.key] ?? '',
                          )}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </Surface>
  );
}
