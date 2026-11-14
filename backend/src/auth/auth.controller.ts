import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { RequestUser } from './interfaces/request-user.interface';
import { User } from '../users/entities/user.entity';
import {
  AUTH_LOGIN_THROTTLE,
  AUTH_REFRESH_THROTTLE,
  AUTH_REGISTER_THROTTLE,
} from './auth-rate-limit';

const REFRESH_COOKIE_NAME = 'refresh_token';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Throttle({ default: AUTH_REGISTER_THROTTLE })
  @Post('register')
  @ApiOperation({
    summary: 'Create a new user account (role-less until an admin assigns one)',
  })
  @ApiOkResponse({ description: 'Account created' })
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto.email, dto.password);
    return this.toPublicUser(user);
  }

  @Public()
  @Throttle({ default: AUTH_LOGIN_THROTTLE })
  @UseGuards(AuthGuard('local'))
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({
    summary: 'Exchange email + password for an access/refresh token pair',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description:
      'Access token, refresh token, and whether this account must change ' +
      'its password before doing anything else (`mustChangePassword`). ' +
      'The refresh token is also set as an httpOnly cookie, scoped to /auth.',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  async login(
    @Req() req: { user: User },
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.login(req.user);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { ...tokens, mustChangePassword: req.user.mustChangePassword };
  }

  @Public()
  @Throttle({ default: AUTH_REFRESH_THROTTLE })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiOperation({
    summary: 'Rotate a refresh token for a new access/refresh pair',
  })
  @ApiBody({
    type: RefreshDto,
    required: false,
    description:
      'Optional when the refresh_token cookie is present; kept as a fallback ' +
      'for clients that cannot use cookies.',
  })
  @ApiOkResponse({
    description:
      'A newly issued access token and refresh token. The rotated refresh ' +
      'token is also set as an httpOnly cookie.',
  })
  @ApiUnauthorizedResponse({
    description: 'The refresh token is invalid, expired, or already revoked',
  })
  async refresh(
    @Req() req: Request,
    @Body() dto: RefreshDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const presentedToken = this.resolveRefreshToken(req, dto);
    if (!presentedToken) {
      throw new UnauthorizedException('Refresh token is required');
    }
    const tokens = await this.authService.refresh(presentedToken);
    this.setRefreshCookie(res, tokens.refreshToken);
    return tokens;
  }

  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  @ApiOperation({
    summary: 'Revoke exactly the refresh token presented, if it is still live',
  })
  @ApiBody({
    type: RefreshDto,
    required: false,
    description:
      'Optional when the refresh_token cookie is present; kept as a fallback ' +
      'for clients that cannot use cookies.',
  })
  async logout(
    @Req() req: Request,
    @Body() dto: RefreshDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const presentedToken = this.resolveRefreshToken(req, dto);
    if (presentedToken) {
      await this.authService.logout(presentedToken);
    }
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/auth' });
  }

  @Patch('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Change the current user’s own password',
    description:
      'Verifies currentPassword, requires newPassword to be at least 12 ' +
      'characters, and revokes every other live refresh token for this ' +
      'user — the session that presents a live refresh_token cookie on ' +
      'this request is kept; every other session is signed out.',
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiUnauthorizedResponse({ description: 'Current password is incorrect' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() actor: RequestUser,
    @Req() req: Request,
  ): Promise<void> {
    const presentedRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as
      string | undefined;
    await this.authService.changePassword(
      actor.id,
      dto.currentPassword,
      dto.newPassword,
      presentedRefreshToken,
    );
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Return the currently authenticated user and their roles',
  })
  @ApiOkResponse({ description: 'The authenticated user' })
  me(@CurrentUser() user: RequestUser) {
    return user;
  }

  private resolveRefreshToken(
    req: Request,
    dto: RefreshDto,
  ): string | undefined {
    const cookieToken = req.cookies?.[REFRESH_COOKIE_NAME] as
      string | undefined;
    return cookieToken ?? dto.refreshToken;
  }

  private setRefreshCookie(res: Response, token: string): void {
    const days = this.config.get<number>('JWT_REFRESH_EXPIRES_IN_DAYS') ?? 7;
    res.cookie(REFRESH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: '/auth',
      maxAge: days * 24 * 60 * 60 * 1000,
    });
  }

  private toPublicUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      roles: user.roles.map((r) => r.name),
    };
  }
}
