import { Notification } from '../entities/notification.entity';

export class NotificationResponseDto {
  id: string;
  type: string;
  relatedEntityType: string;
  relatedEntityId: string;
  message: string;
  status: string;
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedByUserId: string | null;

  static fromEntity(notification: Notification): NotificationResponseDto {
    const dto = new NotificationResponseDto();
    dto.id = notification.id;
    dto.type = notification.type;
    dto.relatedEntityType = notification.relatedEntityType;
    dto.relatedEntityId = notification.relatedEntityId;
    dto.message = notification.message;
    dto.status = notification.status;
    dto.createdAt = notification.createdAt;
    dto.resolvedAt = notification.resolvedAt;
    dto.resolvedByUserId = notification.resolvedByUserId;
    return dto;
  }
}
