import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import PlanDetailPage from './PlanDetailPage';

describe('PlanDetailPage', () => {
  it('has no axe violations (17.1)', async () => {
    const { container } = render(<PlanDetailPage />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
