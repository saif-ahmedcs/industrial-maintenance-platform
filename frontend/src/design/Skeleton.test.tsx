import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('renders a single pulse line by default', () => {
    const { container } = render(<Skeleton />);
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(1);
  });

  it('renders the given number of lines', () => {
    const { container } = render(<Skeleton lines={4} />);
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(4);
  });

  it('treats lines below 1 as a single line', () => {
    const { container } = render(<Skeleton lines={0} />);
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(1);
  });

  it('defaults each line to 16px tall', () => {
    const { container } = render(<Skeleton />);
    const line = container.querySelector('.animate-pulse') as HTMLElement;
    expect(line.style.height).toBe('16px');
  });

  it('applies a numeric height prop in pixels', () => {
    const { container } = render(<Skeleton height={32} />);
    const line = container.querySelector('.animate-pulse') as HTMLElement;
    expect(line.style.height).toBe('32px');
  });

  it('applies a string height prop as-is', () => {
    const { container } = render(<Skeleton height="2rem" />);
    const line = container.querySelector('.animate-pulse') as HTMLElement;
    expect(line.style.height).toBe('2rem');
  });

  it('keeps a single line full width', () => {
    const { container } = render(<Skeleton />);
    const line = container.querySelector('.animate-pulse') as HTMLElement;
    expect(line.style.width).toBe('100%');
  });

  it('narrows only the final line when there are several', () => {
    const { container } = render(<Skeleton lines={3} />);
    const linesEls = Array.from(
      container.querySelectorAll('.animate-pulse'),
    ) as HTMLElement[];
    expect(linesEls[0].style.width).toBe('100%');
    expect(linesEls[1].style.width).toBe('100%');
    expect(linesEls[2].style.width).toBe('70%');
  });

  it('is hidden from assistive tech', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('merges a custom className', () => {
    const { container } = render(<Skeleton className="custom-class" />);
    expect(container.firstElementChild?.className).toContain('custom-class');
  });
});
