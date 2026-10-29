import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { toHaveNoViolations } from 'jest-axe';
import { afterAll, afterEach, beforeAll, expect } from 'vitest';
import { server } from './msw/server';

expect.extend(toHaveNoViolations);

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterEach(() => cleanup());
afterAll(() => server.close());
