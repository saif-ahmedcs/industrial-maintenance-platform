import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import UsersPage from './UsersPage';

describe('UsersPage', () => {
  it('has no axe violations (17.1)', async () => {
    const { container } = render(<UsersPage />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
