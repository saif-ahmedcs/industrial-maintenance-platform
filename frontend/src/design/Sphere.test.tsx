import { fireEvent, render, within } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from 'vitest';
import { Sphere } from './Sphere';

function installCanvasContextMock() {
  const ctx = {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    setTransform: vi.fn(),
    fillStyle: '',
    globalAlpha: 1,
  };

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    ctx as unknown as CanvasRenderingContext2D,
  );

  return ctx;
}

describe('Sphere', () => {
  let rafSpy: Mock;
  let cancelRafSpy: Mock;

  beforeEach(() => {
    installCanvasContextMock();
    // Never actually schedule a frame — keeps tests synchronous and
    // lets us assert whether the rotation loop was started at all.
    rafSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockReturnValue(1) as unknown as Mock;
    cancelRafSpy = vi.spyOn(window, 'cancelAnimationFrame') as unknown as Mock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders a canvas at the default 240px size', () => {
    const { container } = render(<Sphere />);
    const el = within(container).getByTestId('sphere-canvas');
    expect(el.tagName).toBe('CANVAS');
    expect(el.style.width).toBe('240px');
    expect(el.style.height).toBe('240px');
  });

  it('renders at a custom size', () => {
    const { container } = render(<Sphere size={96} />);
    const el = within(container).getByTestId('sphere-canvas');
    expect(el.style.width).toBe('96px');
    expect(el.style.height).toBe('96px');
  });

  it('is decorative: hidden from assistive tech and never captures pointer input', () => {
    const { container } = render(<Sphere />);
    const el = within(container).getByTestId('sphere-canvas');
    expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(el.className).toContain('pointer-events-none');
  });

  it('merges a custom className alongside the generated classes', () => {
    const { container } = render(<Sphere className="custom-class" />);
    const el = within(container).getByTestId('sphere-canvas');
    expect(el.className).toContain('custom-class');
    expect(el.className).toContain('pointer-events-none');
  });

  it('starts the rotation loop when animated (the default)', () => {
    render(<Sphere />);
    expect(rafSpy).toHaveBeenCalled();
  });

  it('draws a single static frame and does not start the rotation loop when animated is false', () => {
    const ctx = installCanvasContextMock();
    render(<Sphere animated={false} />);
    expect(rafSpy).not.toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('cancels the rotation loop on unmount', () => {
    const { unmount } = render(<Sphere />);
    unmount();
    expect(cancelRafSpy).toHaveBeenCalledWith(1);
  });

  it('skips the rotation loop and draws a still frame when the OS prefers reduced motion', () => {
    const ctx = installCanvasContextMock();
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        media: '(prefers-reduced-motion: reduce)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );

    render(<Sphere />);

    expect(rafSpy).not.toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('pauses the rotation loop when the tab is hidden, and resumes it when visible again', () => {
    render(<Sphere />);
    expect(rafSpy).toHaveBeenCalledTimes(1);

    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    fireEvent(document, new Event('visibilitychange'));
    expect(cancelRafSpy).toHaveBeenCalledWith(1);

    rafSpy.mockClear();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    fireEvent(document, new Event('visibilitychange'));
    expect(rafSpy).toHaveBeenCalled();
  });
});
