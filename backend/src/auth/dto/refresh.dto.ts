import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshDto {
  @ApiPropertyOptional({
    description:
      'The refresh token issued at login or by a previous call to this endpoint. ' +
      'Optional when the refresh_token httpOnly cookie is present — the cookie is ' +
      'preferred and this field is kept only as a fallback for clients that cannot use cookies.',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
