import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { paginate, PaginatedResult } from '../common/pagination/paginate';
import { NotificationQueryDto } from './dto/notification-query.dto';
import {
  Notification,
  NotificationStatus,
  NotificationType,
} from './entities/notification.entity';

export interface RecordNotificationParams {
  type: NotificationType;
  relatedEntityType: string;
  relatedEntityId: string;
  message: string;
}

const SORTABLE_FIELDS = ['notification.createdAt', 'notification.status'];
const ACTIVE_NOTIFICATION_STATUSES = [
  NotificationStatus.UNREAD,
  NotificationStatus.ACKNOWLEDGED,
];

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  async record(
    manager: EntityManager,
    params: RecordNotificationParams,
  ): Promise<Notification> {
    const entry = manager.create(Notification, {
      type: params.type,
      relatedEntityType: params.relatedEntityType,
      relatedEntityId: params.relatedEntityId,
      message: params.message,
      status: NotificationStatus.UNREAD,
    });

    return manager.save(entry);
  }

  async hasActiveNotification(
    type: NotificationType,
    relatedEntityType: string,
    relatedEntityId: string,
  ): Promise<boolean> {
    const count = await this.notificationRepo.count({
      where: {
        type,
        relatedEntityType,
        relatedEntityId,
        status: In(ACTIVE_NOTIFICATION_STATUSES),
      },
    });
    return count > 0;
  }

  async findAll(
    query: NotificationQueryDto,
  ): Promise<PaginatedResult<Notification>> {
    const qb = this.notificationRepo.createQueryBuilder('notification');
    if (query.type) {
      qb.andWhere('notification.type = :type', { type: query.type });
    }
    if (query.status) {
      qb.andWhere('notification.status = :status', { status: query.status });
    }
    if (query.relatedEntityId) {
      qb.andWhere('notification.relatedEntityId = :relatedEntityId', {
        relatedEntityId: query.relatedEntityId,
      });
    }
    return paginate(qb, query, {
      defaultSortBy: 'notification.createdAt',
      allowedSortFields: SORTABLE_FIELDS,
    });
  }

  async acknowledge(id: string): Promise<Notification> {
    const notification = await this.notificationRepo.findOneBy({ id });
    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found`);
    }
    if (notification.status === NotificationStatus.RESOLVED) {
      throw new ConflictException(
        'Cannot acknowledge a notification that is already resolved',
      );
    }

    notification.status = NotificationStatus.ACKNOWLEDGED;
    return this.notificationRepo.save(notification);
  }

  async resolve(id: string, actor: RequestUser): Promise<Notification> {
    const notification = await this.notificationRepo.findOneBy({ id });
    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found`);
    }
    if (notification.status === NotificationStatus.RESOLVED) {
      throw new ConflictException('Notification is already resolved');
    }

    notification.status = NotificationStatus.RESOLVED;
    notification.resolvedAt = new Date();
    notification.resolvedByUserId = actor.id;
    return this.notificationRepo.save(notification);
  }
}
