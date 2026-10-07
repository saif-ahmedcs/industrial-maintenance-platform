import { ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator';
import { UserThrottlerGuard } from './user-throttler.guard';

describe('UserThrottlerGuard', () => {
  let guard: UserThrottlerGuard;
  let jwtService: { verify: jest.Mock };
  let reflector: { getAllAndOverride: jest.Mock };
  let baseTracker: jest.SpyInstance;

  const getTracker = (req: Record<string, any>): Promise<string> =>
    (guard as any).getTracker(req);

  beforeEach(() => {
    jwtService = { verify: jest.fn() };
    reflector = { getAllAndOverride: jest.fn() };
    guard = new UserThrottlerGuard(
      { throttlers: [] } as any,
      {} as any,
      reflector as any,
      jwtService as any,
    );
    // The base class keys by (normalised) client IP. Stubbing it keeps these
    // tests about when the guard defers to it, not about how it normalises IPs.
    baseTracker = jest
      .spyOn(ThrottlerGuard.prototype as any, 'getTracker')
      .mockResolvedValue('ip-tracker');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getTracker', () => {
    it('keys an authenticated request by the user id from a valid bearer token', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1' });

      const tracker = await getTracker({
        headers: { authorization: 'Bearer valid.jwt.token' },
      });

      expect(tracker).toBe('user:user-1');
      expect(jwtService.verify).toHaveBeenCalledWith('valid.jwt.token');
      expect(baseTracker).not.toHaveBeenCalled();
    });

    it('gives two users on the same connection different trackers', async () => {
      jwtService.verify.mockImplementation((token: string) => ({
        sub: token === 'token-a' ? 'user-a' : 'user-b',
      }));

      const a = await getTracker({
        headers: { authorization: 'Bearer token-a' },
      });
      const b = await getTracker({
        headers: { authorization: 'Bearer token-b' },
      });

      expect(a).toBe('user:user-a');
      expect(b).toBe('user:user-b');
    });

    it('defers to the IP tracker when there is no authorization header', async () => {
      const req = { headers: {} };

      expect(await getTracker(req)).toBe('ip-tracker');

      expect(baseTracker).toHaveBeenCalledWith(req);
      expect(jwtService.verify).not.toHaveBeenCalled();
    });

    it('defers to the IP tracker when the authorization scheme is not Bearer', async () => {
      const tracker = await getTracker({
        headers: { authorization: 'Basic dXNlcjpwYXNz' },
      });

      expect(tracker).toBe('ip-tracker');
      expect(jwtService.verify).not.toHaveBeenCalled();
    });

    it('defers to the IP tracker when the token is invalid or expired', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      const tracker = await getTracker({
        headers: { authorization: 'Bearer bad.jwt.token' },
      });

      expect(tracker).toBe('ip-tracker');
    });

    it('defers to the IP tracker when the verified payload has no subject', async () => {
      jwtService.verify.mockReturnValue({ email: 'a@example.com' });

      const tracker = await getTracker({
        headers: { authorization: 'Bearer no.sub.token' },
      });

      expect(tracker).toBe('ip-tracker');
    });

    it('keeps IP keying on public routes even when a valid token is presented', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1' });

      const tracker = await getTracker({
        headers: { authorization: 'Bearer valid.jwt.token' },
        __isPublicThrottleRoute: true,
      });

      expect(tracker).toBe('ip-tracker');
      expect(jwtService.verify).not.toHaveBeenCalled();
    });
  });

  describe('canActivate', () => {
    const handler = () => undefined;
    class TestController {}

    const buildContext = (req: Record<string, any>): ExecutionContext =>
      ({
        switchToHttp: () => ({ getRequest: () => req }),
        getHandler: () => handler,
        getClass: () => TestController,
      }) as unknown as ExecutionContext;

    it('marks the request as public while the base guard runs, then clears the mark', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const req: Record<string, any> = { headers: {} };
      let markDuringBaseGuard: unknown;
      jest
        .spyOn(ThrottlerGuard.prototype, 'canActivate')
        .mockImplementation(async () => {
          markDuringBaseGuard = req.__isPublicThrottleRoute;
          return true;
        });

      await expect(guard.canActivate(buildContext(req))).resolves.toBe(true);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        handler,
        TestController,
      ]);
      expect(markDuringBaseGuard).toBe(true);
      expect('__isPublicThrottleRoute' in req).toBe(false);
    });

    it('clears the mark even when the base guard rejects the request', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const req: Record<string, any> = { headers: {} };
      jest
        .spyOn(ThrottlerGuard.prototype, 'canActivate')
        .mockRejectedValue(new Error('Too Many Requests'));

      await expect(guard.canActivate(buildContext(req))).rejects.toThrow(
        'Too Many Requests',
      );

      expect('__isPublicThrottleRoute' in req).toBe(false);
    });
  });
});
