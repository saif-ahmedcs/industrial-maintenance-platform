import { UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { User } from '../users/entities/user.entity';
import { AuthController } from './auth.controller';
import { RefreshDto } from './dto/refresh.dto';

const COOKIE_NAME = 'refresh_token';
const DAY_MS = 24 * 60 * 60 * 1000;

describe('AuthController refresh-token cookie', () => {
  let controller: AuthController;
  let authService: { login: jest.Mock; refresh: jest.Mock; logout: jest.Mock };
  let configValues: Record<string, unknown>;
  let res: { cookie: jest.Mock; clearCookie: jest.Mock };

  const asResponse = () => res as unknown as Response;
  const requestWithCookies = (cookies?: Record<string, string>) =>
    ({ cookies }) as unknown as Request;
  const body = (refreshToken?: string): RefreshDto => ({ refreshToken });

  beforeEach(() => {
    authService = {
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn().mockResolvedValue(undefined),
    };
    configValues = { NODE_ENV: 'development', JWT_REFRESH_EXPIRES_IN_DAYS: 7 };
    res = { cookie: jest.fn(), clearCookie: jest.fn() };
    controller = new AuthController(authService as any, {
      get: jest.fn((key: string) => configValues[key]),
    } as any);
  });

  describe('login', () => {
    beforeEach(() => {
      authService.login.mockResolvedValue({
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
      });
    });

    it('returns the tokens in the body and sets the refresh token as an httpOnly, strict, /auth-scoped cookie', async () => {
      const result = await controller.login(
        { user: { id: 'user-1' } as User },
        asResponse(),
      );

      expect(result).toEqual({
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
      });
      expect(res.cookie).toHaveBeenCalledWith(COOKIE_NAME, 'refresh-1', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        path: '/auth',
        maxAge: 7 * DAY_MS,
      });
    });

    it('marks the cookie secure in production', async () => {
      configValues.NODE_ENV = 'production';

      await controller.login({ user: {} as User }, asResponse());

      expect(res.cookie).toHaveBeenCalledWith(
        COOKIE_NAME,
        'refresh-1',
        expect.objectContaining({ secure: true }),
      );
    });

    it('sizes the cookie lifetime from JWT_REFRESH_EXPIRES_IN_DAYS', async () => {
      configValues.JWT_REFRESH_EXPIRES_IN_DAYS = 14;

      await controller.login({ user: {} as User }, asResponse());

      expect(res.cookie).toHaveBeenCalledWith(
        COOKIE_NAME,
        'refresh-1',
        expect.objectContaining({ maxAge: 14 * DAY_MS }),
      );
    });

    it('defaults the cookie lifetime to 7 days when the setting is absent', async () => {
      delete configValues.JWT_REFRESH_EXPIRES_IN_DAYS;

      await controller.login({ user: {} as User }, asResponse());

      expect(res.cookie).toHaveBeenCalledWith(
        COOKIE_NAME,
        'refresh-1',
        expect.objectContaining({ maxAge: 7 * DAY_MS }),
      );
    });
  });

  describe('refresh', () => {
    beforeEach(() => {
      authService.refresh.mockResolvedValue({
        accessToken: 'access-2',
        refreshToken: 'refresh-2',
      });
    });

    it('rotates using the cookie token and sets the rotated token as the new cookie', async () => {
      const result = await controller.refresh(
        requestWithCookies({ [COOKIE_NAME]: 'cookie-token' }),
        body(),
        asResponse(),
      );

      expect(authService.refresh).toHaveBeenCalledWith('cookie-token');
      expect(result).toEqual({
        accessToken: 'access-2',
        refreshToken: 'refresh-2',
      });
      expect(res.cookie).toHaveBeenCalledWith(
        COOKIE_NAME,
        'refresh-2',
        expect.objectContaining({ httpOnly: true, path: '/auth' }),
      );
    });

    it('prefers the cookie token over a body token when both are present', async () => {
      await controller.refresh(
        requestWithCookies({ [COOKIE_NAME]: 'cookie-token' }),
        body('body-token'),
        asResponse(),
      );

      expect(authService.refresh).toHaveBeenCalledWith('cookie-token');
    });

    it('falls back to the body token when there is no cookie', async () => {
      await controller.refresh(
        requestWithCookies({}),
        body('body-token'),
        asResponse(),
      );

      expect(authService.refresh).toHaveBeenCalledWith('body-token');
    });

    it('falls back to the body token when cookie parsing is not active and req.cookies is undefined', async () => {
      await controller.refresh(
        requestWithCookies(undefined),
        body('body-token'),
        asResponse(),
      );

      expect(authService.refresh).toHaveBeenCalledWith('body-token');
    });

    it('rejects with 401 and sets no cookie when neither a cookie nor a body token is present', async () => {
      await expect(
        controller.refresh(requestWithCookies({}), body(), asResponse()),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(authService.refresh).not.toHaveBeenCalled();
      expect(res.cookie).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('revokes the cookie token and clears the cookie on the same path', async () => {
      await controller.logout(
        requestWithCookies({ [COOKIE_NAME]: 'cookie-token' }),
        body(),
        asResponse(),
      );

      expect(authService.logout).toHaveBeenCalledWith('cookie-token');
      expect(res.clearCookie).toHaveBeenCalledWith(COOKIE_NAME, {
        path: '/auth',
      });
    });

    it('revokes the body token when there is no cookie', async () => {
      await controller.logout(
        requestWithCookies({}),
        body('body-token'),
        asResponse(),
      );

      expect(authService.logout).toHaveBeenCalledWith('body-token');
      expect(res.clearCookie).toHaveBeenCalledWith(COOKIE_NAME, {
        path: '/auth',
      });
    });

    it('still clears the cookie, without calling the service, when no token is presented', async () => {
      await controller.logout(requestWithCookies({}), body(), asResponse());

      expect(authService.logout).not.toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledWith(COOKIE_NAME, {
        path: '/auth',
      });
    });
  });
});
