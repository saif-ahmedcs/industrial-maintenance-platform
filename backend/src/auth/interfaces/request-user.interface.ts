import { RoleName } from '../../users/entities/role.entity';

export interface RequestUser {
  id: string;
  email: string;
  roles: RoleName[];
}
