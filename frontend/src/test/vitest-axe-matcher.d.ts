// Augments Vitest's `Assertion` type with the `toHaveNoViolations` matcher
// registered via `expect.extend(toHaveNoViolations)` in `setup.ts`, the
// same pattern `@testing-library/jest-dom/types/vitest.d.ts` uses for its
// own matchers. This file needs the `import 'vitest'` below to be treated
// as an augmentation of the real `vitest` module rather than a fresh
// declaration (see `jest-axe.d.ts` for the opposite case).
import 'vitest';

declare module 'vitest' {
  interface Assertion<T = unknown> {
    toHaveNoViolations(): T;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void;
  }
}
