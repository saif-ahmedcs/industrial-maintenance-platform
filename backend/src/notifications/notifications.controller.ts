import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { RoleName } from '../users/entities/role.entity';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
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
  async acknowledge(@Param('id', ParseUUIDPipe) id: string) {
    return NotificationResponseDto.fromEntity(
      await this.notificationsService.acknowledge(id),
    );
  }

  @Patch(':id/resolve')
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR, RoleName.TECHNICIAN)
  async resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return NotificationResponseDto.fromEntity(
      await this.notificationsService.resolve(id, user),
    );
  }
}
