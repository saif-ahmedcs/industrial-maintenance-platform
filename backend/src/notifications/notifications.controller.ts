import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { RoleName } from '../users/entities/role.entity';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
@UseGuards(RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary:
      'List notifications (paginated, filterable by type/status/related entity)',
  })
  @ApiOkResponse({
    description: 'Paginated list of notifications',
    type: NotificationResponseDto,
    isArray: true,
  })
  async findAll(@Query() query: NotificationQueryDto) {
    const result = await this.notificationsService.findAll(query);
    return {
      data: result.data.map((notification) =>
        NotificationResponseDto.fromEntity(notification),
      ),
      meta: result.meta,
    };
  }

  @Patch(':id/acknowledge')
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR, RoleName.TECHNICIAN)
  @ApiOperation({
    summary: 'Mark a notification as acknowledged (seen, not yet resolved)',
  })
  @ApiOkResponse({ type: NotificationResponseDto })
  async acknowledge(@Param('id', ParseUUIDPipe) id: string) {
    return NotificationResponseDto.fromEntity(
      await this.notificationsService.acknowledge(id),
    );
  }

  @Patch(':id/resolve')
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR, RoleName.TECHNICIAN)
  @ApiOperation({ summary: 'Mark a notification as resolved' })
  @ApiOkResponse({ type: NotificationResponseDto })
  async resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return NotificationResponseDto.fromEntity(
      await this.notificationsService.resolve(id, user),
    );
  }
}
