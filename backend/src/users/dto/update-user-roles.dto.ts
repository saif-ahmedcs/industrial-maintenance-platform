import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsEnum } from 'class-validator';
import { RoleName } from '../entities/role.entity';

export class UpdateUserRolesDto {
  @ApiProperty({
    enum: RoleName,
    isArray: true,
    description:
      'Replaces the full role set. Removing ADMIN from the last active ' +
      'ADMIN returns 409.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(RoleName, { each: true })
  roles: RoleName[];
}
