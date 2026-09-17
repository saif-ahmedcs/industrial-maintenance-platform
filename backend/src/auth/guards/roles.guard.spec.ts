import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { RoleName } from '../../users/entities/role.entity';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  const buildContext = (user?: { roles: RoleName[] }): ExecutionContext => {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows the request through when no @Roles() metadata is present', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const context = buildContext(undefined);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows a user who has one of the required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([RoleName.ADMIN]);

    const context = buildContext({
      roles: [RoleName.ADMIN, RoleName.VIEWER],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws ForbiddenException for a user without any required role', () => {
    reflector.getAllAndOverride.mockReturnValue([RoleName.ADMIN]);

    const context = buildContext({ roles: [RoleName.TECHNICIAN] });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when there is no authenticated user at all', () => {
    reflector.getAllAndOverride.mockReturnValue([RoleName.ADMIN]);

    const context = buildContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
