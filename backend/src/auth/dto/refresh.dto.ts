import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshDto {
  @ApiProperty({
    description:
      'The refresh token issued at login or by a previous call to this endpoint',
  })
  @IsString()
  refreshToken: string;
}
