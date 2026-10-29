import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import SparePartDetailPage from './SparePartDetailPage';

describe('SparePartDetailPage', () => {
  it('has no axe violations (17.1)', async () => {
    const { container } = render(<SparePartDetailPage />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
