// `jest-axe` ships no type declarations of its own. Rather than installing
// `@types/jest-axe` — which pulls in `@types/jest` (unused in this Vitest
// project) and pins an outdated `axe-core@^3.5.5` that doesn't match the
// `axe-core@4.12.1` actually installed — this declares only the two exports
// this repo uses, typed against the real, already-installed `axe-core`.
//
// Deliberately has no top-level import/export: that would make this file a
// "module", which turns `declare module 'jest-axe'` below into a module
// *augmentation* (merging into an existing declaration) instead of a fresh
// ambient declaration — and jest-axe has no existing declaration to
// augment, so the import would silently stay untyped. Referencing
// `axe-core`'s types via inline `import('axe-core').X` keeps this a global
// script instead. The matching `expect.toHaveNoViolations()` augmentation
// of Vitest's `Assertion` type lives in `vitest-axe-matcher.d.ts`, which
// *does* need to be a module for that augmentation to apply.
declare module 'jest-axe' {
  export function axe(
    html: Element | string,
    options?: import('axe-core').RunOptions,
  ): Promise<import('axe-core').AxeResults>;

  export const toHaveNoViolations: {
    toHaveNoViolations(results: import('axe-core').AxeResults): {
      pass: boolean;
      message: () => string;
    };
  };
}
