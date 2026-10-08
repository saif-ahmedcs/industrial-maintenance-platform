import {
  useLayoutEffect,
  useRef,
  type ComponentType,
  type SVGProps,
} from 'react';

export type TablerIconComponent = ComponentType<
  SVGProps<SVGSVGElement> & {
    size?: string | number;
    stroke?: string | number;
  }
>;

export interface IconProps {
  icon: TablerIconComponent;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
}

export function Icon({
  icon: TablerIcon,
  size = 20,
  strokeWidth,
  label,
  className,
}: IconProps) {
  const wrapperRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (!import.meta.env.DEV || label) return;

    const button = wrapperRef.current?.closest('button');
    if (!button) return;

    const hasAccessibleName =
      button.hasAttribute('aria-label') ||
      button.hasAttribute('aria-labelledby') ||
      (button.textContent ?? '').trim().length > 0;

    if (!hasAccessibleName) {
      throw new Error(
        '<Icon> is inside a <button> that has no accessible name. Pass a ' +
          '`label` prop to Icon (e.g. <Icon icon={IconTrash} label="Delete" />), ' +
          'or give the button its own aria-label.',
      );
    }
  }, [label]);

  return (
    <span
      ref={wrapperRef}
      className={className}
      style={{ display: 'inline-flex', lineHeight: 0 }}
    >
      <TablerIcon
        size={size}
        stroke={strokeWidth === undefined ? undefined : String(strokeWidth)}
        aria-hidden={label ? undefined : true}
        role={label ? 'img' : undefined}
        aria-label={label}
      />
    </span>
  );
}
