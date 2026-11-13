import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Jordan Reyes' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description:
      'Deactivating revokes all of this user\u2019s refresh tokens. The ' +
      'last active ADMIN cannot be deactivated (409).',
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
