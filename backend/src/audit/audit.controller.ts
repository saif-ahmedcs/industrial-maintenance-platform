import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RoleName } from '../users/entities/role.entity';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit-query.dto';

@ApiTags('audit')
@ApiBearerAuth('access-token')
@Controller('audit')
@UseGuards(RolesGuard)
@Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({
    summary: 'Query the append-only audit log (ADMIN, SUPERVISOR)',
    description:
      'audit_logs is immutable at the database level (REVOKE + trigger) — this is read-only by construction, not just by omission of write routes.',
  })
  @ApiOkResponse({
    description:
      'Paginated audit_logs rows: id, actorUserId (nullable), entityType, entityId, action, before (jsonb), after (jsonb), source, createdAt',
  })
  findAll(@Query() query: AuditQueryDto) {
    return this.auditService.findAll(query);
  }
}
