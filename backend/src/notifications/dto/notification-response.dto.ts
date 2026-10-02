import { ApiProperty } from '@nestjs/swagger';
import { Notification } from '../entities/notification.entity';

export class NotificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ['CRITICAL_ASSET', 'OVERDUE_MAINTENANCE', 'LOW_STOCK'] })
  type: string;

  @ApiProperty()
  relatedEntityType: string;

  @ApiProperty()
  relatedEntityId: string;

  @ApiProperty()
  message: string;

  @ApiProperty({
    nullable: true,
    description:
      'AI-generated diagnostic note, present only when enabled and successful',
  })
  aiNote: string | null;

  @ApiProperty({ enum: ['UNREAD', 'ACKNOWLEDGED', 'RESOLVED'] })
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ nullable: true })
  resolvedAt: Date | null;

  @ApiProperty({ nullable: true })
  resolvedByUserId: string | null;

  static fromEntity(notification: Notification): NotificationResponseDto {
    const dto = new NotificationResponseDto();
    dto.id = notification.id;
    dto.type = notification.type;
    dto.relatedEntityType = notification.relatedEntityType;
    dto.relatedEntityId = notification.relatedEntityId;
    dto.message = notification.message;
    dto.aiNote = notification.aiNote ?? null;
    dto.status = notification.status;
    dto.createdAt = notification.createdAt;
    dto.resolvedAt = notification.resolvedAt;
    dto.resolvedByUserId = notification.resolvedByUserId;
    return dto;
  }
}
