import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
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
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { RequestUser } from './interfaces/request-user.interface';
import { User } from '../users/entities/user.entity';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
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
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(AuthGuard('local'))
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({
    summary: 'Exchange email + password for an access/refresh token pair',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'Access token, refresh token, and the authenticated user',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  async login(@Req() req: { user: User }) {
    return this.authService.login(req.user);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiOperation({
    summary: 'Rotate a refresh token for a new access/refresh pair',
  })
  @ApiOkResponse({
    description: 'A newly issued access token and refresh token',
  })
  @ApiUnauthorizedResponse({
    description: 'The refresh token is invalid, expired, or already revoked',
  })
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  @ApiOperation({
    summary: 'Revoke a refresh token (and its full rotation chain)',
  })
  async logout(@Body() dto: RefreshDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
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

  private toPublicUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      roles: user.roles.map((r) => r.name),
    };
  }
}
