import type { KeyboardEvent } from 'react';

export interface TabItem {
  value: string;
  label: string;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function Tabs({ items, value, onChange, className }: TabsProps) {
  function focusTab(index: number) {
    const id = `tab-${items[index]?.value}`;
    document.getElementById(id)?.focus();
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      const next = (index + 1) % items.length;
      onChange(items[next].value);
      focusTab(next);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      const prev = (index - 1 + items.length) % items.length;
      onChange(items[prev].value);
      focusTab(prev);
    }
  }

  return (
    <div
      role="tablist"
      className={['flex items-center gap-6', className]
        .filter(Boolean)
        .join(' ')}
    >
      {items.map((item, index) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            id={`tab-${item.value}`}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={[
              'font-display',
              'uppercase',
              'text-label',
              'font-normal',
              'border-b-2',
              'pb-2',
              active
                ? 'border-text-mist text-text-platinum'
                : 'border-transparent text-text-silver',
            ].join(' ')}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
