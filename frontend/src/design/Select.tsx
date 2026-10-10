import {
  useId,
  useState,
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
} from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectOwnProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  searchable?: boolean;
  error?: string;
  placeholder?: string;
  className?: string;
}

export type SelectProps = SelectOwnProps &
  Omit<ComponentPropsWithoutRef<'input'>, keyof SelectOwnProps | 'type'>;

const CONTROL_CLASSES = [
  'w-full',
  'rounded-small',
  'border',
  'border-surface-slate',
  'bg-surface-kelp',
  'px-[14px]',
  'py-3',
  'font-ui',
  'text-ui',
  'text-text-platinum',
  'focus:border-text-mist',
  'disabled:opacity-50',
  'disabled:cursor-not-allowed',
].join(' ');

export function Select({
  options,
  value,
  onChange,
  searchable = false,
  error,
  placeholder,
  className,
  disabled,
  id,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  ...rest
}: SelectProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const listboxId = `${generatedId}-listbox`;
  const errorId = `${generatedId}-error`;

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const selected = options.find((option) => option.value === value);

  const filtered =
    searchable && isOpen && query
      ? options.filter((option) =>
          option.label.toLowerCase().includes(query.toLowerCase()),
        )
      : options;

  const describedBy =
    [ariaDescribedBy, error ? errorId : null].filter(Boolean).join(' ') ||
    undefined;
  const invalid = error ? true : ariaInvalid;

  const controlClasses = [CONTROL_CLASSES, className].filter(Boolean).join(' ');

  function selectOption(option: SelectOption) {
    onChange(option.value);
    setIsOpen(false);
    setQuery('');
  }

  function openList() {
    if (disabled) return;
    setIsOpen(true);
    setHighlightedIndex(0);
    setQuery('');
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isOpen) {
        openList();
        return;
      }
      setHighlightedIndex((index) => Math.min(index + 1, filtered.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) {
        openList();
        return;
      }
      setHighlightedIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      if (!isOpen) return;
      event.preventDefault();
      const option = filtered[highlightedIndex];
      if (option) selectOption(option);
      return;
    }

    if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      setIsOpen(false);
      setQuery('');
    }
  }

  if (!searchable) {
    return (
      <div className="flex flex-col gap-1.5">
        <select
          id={controlId}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          className={controlClasses}
        >
          {placeholder && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p id={errorId} className="font-ui text-ui text-accent-lavender">
            {error}
          </p>
        )}
      </div>
    );
  }

  const displayValue = isOpen ? query : (selected?.label ?? '');
  const activeOption = filtered[highlightedIndex];
  const activeOptionId =
    isOpen && activeOption ? `${listboxId}-${activeOption.value}` : undefined;

  return (
    <div className="relative flex flex-col gap-1.5">
      <input
        {...rest}
        id={controlId}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeOptionId}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        disabled={disabled}
        placeholder={placeholder}
        value={displayValue}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
          setHighlightedIndex(0);
        }}
        onFocus={openList}
        onBlur={() => {
          setIsOpen(false);
          setQuery('');
        }}
        onKeyDown={handleKeyDown}
        className={controlClasses}
      />
      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          onMouseDown={(event) => event.preventDefault()}
          className={[
            'absolute',
            'top-full',
            'z-10',
            'mt-1',
            'max-h-60',
            'w-full',
            'overflow-auto',
            'rounded-small',
            'border',
            'border-surface-slate',
            'bg-surface-kelp',
            'py-1',
          ].join(' ')}
        >
          {filtered.length === 0 ? (
            <li className="px-[14px] py-2 font-ui text-ui text-text-silver">
              No matches
            </li>
          ) : (
            filtered.map((option, index) => (
              <li
                key={option.value}
                id={`${listboxId}-${option.value}`}
                role="option"
                aria-selected={option.value === value}
                onClick={() => selectOption(option)}
                className={[
                  'cursor-pointer',
                  'px-[14px]',
                  'py-2',
                  'font-ui',
                  'text-ui',
                  index === highlightedIndex
                    ? 'bg-surface-abyss text-text-platinum'
                    : 'text-text-silver',
                ].join(' ')}
              >
                {option.label}
              </li>
            ))
          )}
        </ul>
      )}
      {error && (
        <p id={errorId} className="font-ui text-ui text-accent-lavender">
          {error}
        </p>
      )}
    </div>
  );
}
