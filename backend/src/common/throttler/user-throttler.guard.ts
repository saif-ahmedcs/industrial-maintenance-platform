import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  type ThrottlerModuleOptions,
  type ThrottlerStorage,
} from '@nestjs/throttler';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {
    super(options, storageService, reflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Record<string, any>>();
    req.__isPublicThrottleRoute = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );

    try {
      return await super.canActivate(context);
    } finally {
      delete req.__isPublicThrottleRoute;
    }
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    if (!req.__isPublicThrottleRoute) {
      const authHeader = req.headers?.authorization as string | undefined;
      if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice('Bearer '.length);
        try {
          const payload = this.jwtService.verify<JwtPayload>(token);
          if (payload?.sub) {
            return `user:${payload.sub}`;
          }
        } catch {}
      }
    }

    return super.getTracker(req);
  }
}
