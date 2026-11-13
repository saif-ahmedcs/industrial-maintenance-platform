import { ApiProperty } from '@nestjs/swagger';
import { RoleName } from '../entities/role.entity';
import { User } from '../entities/user.entity';

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ nullable: true })
  name: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ enum: RoleName, isArray: true })
  roles: RoleName[];

  @ApiProperty()
  createdAt: Date;

  static fromEntity(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.name = user.name;
    dto.isActive = user.isActive;
    dto.roles = user.roles.map((role) => role.name);
    dto.createdAt = user.createdAt;
    return dto;
  }
}

export class CreateUserResponseDto extends UserResponseDto {
  @ApiProperty({
    description:
      'Shown once. It is hashed before storage and cannot be retrieved ' +
      'again \u2014 use the (B3) reset-password endpoint if it is lost.',
  })
  temporaryPassword: string;

  static fromUserAndPassword(
    user: User,
    temporaryPassword: string,
  ): CreateUserResponseDto {
    const dto = new CreateUserResponseDto();
    Object.assign(dto, UserResponseDto.fromEntity(user));
    dto.temporaryPassword = temporaryPassword;
    return dto;
  }
}
