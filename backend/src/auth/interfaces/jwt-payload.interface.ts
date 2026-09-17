import { RoleName } from '../../users/entities/role.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  roles: RoleName[];
}
