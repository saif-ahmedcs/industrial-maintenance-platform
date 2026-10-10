import { cloneElement, isValidElement, useId, type ReactElement } from 'react';

type FieldableProps = {
  id?: string;
  className?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
};

export interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactElement<FieldableProps>;
}

const INPUT_CLASSES = [
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
].join(' ');

export function Field({ label, error, hint, className, children }: FieldProps) {
  const generatedId = useId();
  const hintId = `${generatedId}-hint`;
  const errorId = `${generatedId}-error`;

  const childId =
    (isValidElement(children) && children.props.id) || generatedId;

  const describedBy =
    [hint && !error ? hintId : null, error ? errorId : null]
      .filter(Boolean)
      .join(' ') || undefined;

  const field = isValidElement(children)
    ? cloneElement(children, {
        id: childId,
        'aria-describedby':
          [children.props['aria-describedby'], describedBy]
            .filter(Boolean)
            .join(' ') || undefined,
        'aria-invalid': error ? true : children.props['aria-invalid'],
        className: [INPUT_CLASSES, children.props.className]
          .filter(Boolean)
          .join(' '),
      })
    : children;

  const classes = ['flex', 'flex-col', 'gap-1.5', className]
    .filter(Boolean)
    .join(' ');

  const labelClasses = [
    'font-display',
    'uppercase',
    'text-label', // 12px / 1.4 / 0.12em
    'font-normal',
    'text-text-silver',
  ].join(' ');

  return (
    <div className={classes}>
      <label htmlFor={childId} className={labelClasses}>
        {label}
      </label>
      {field}
      {/* Error replaces the hint rather than stacking below it. */}
      {error ? (
        <p id={errorId} className="font-ui text-ui text-accent-lavender">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="font-ui text-ui text-text-silver">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
