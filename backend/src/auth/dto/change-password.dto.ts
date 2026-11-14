import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'CorrectHorseBattery9!' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'EvenStrongerPassword123!', minLength: 12 })
  @IsString()
  @MinLength(12)
  newPassword: string;
}
