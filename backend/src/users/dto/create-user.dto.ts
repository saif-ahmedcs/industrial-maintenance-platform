import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';
import { RoleName } from '../entities/role.entity';

export class CreateUserDto {
  @ApiProperty({ example: 'supervisor@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Jordan Reyes' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    enum: RoleName,
    isArray: true,
    example: [RoleName.SUPERVISOR],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(RoleName, { each: true })
  roles: RoleName[];
}
