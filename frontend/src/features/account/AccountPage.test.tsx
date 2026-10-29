import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import AccountPage from './AccountPage';

describe('AccountPage', () => {
  it('has no axe violations (17.1)', async () => {
    const { container } = render(<AccountPage />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
