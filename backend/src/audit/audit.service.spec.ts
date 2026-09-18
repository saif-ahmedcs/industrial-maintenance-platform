import { AuditService } from './audit.service';
import { AuditLog } from './entities/audit-log.entity';

describe('AuditService', () => {
  let service: AuditService;
  let auditLogRepo: { createQueryBuilder: jest.Mock };

  beforeEach(() => {
    auditLogRepo = { createQueryBuilder: jest.fn() };
    service = new AuditService(auditLogRepo as any);
  });

  describe('record', () => {
    it('creates the entry via the given manager and persists it', async () => {
      const manager = {
        create: jest.fn((_entity, plain) => plain),
        save: jest.fn(async (entity) => ({ ...entity, id: 'audit-1' })),
      };

      const result = await service.record(manager as any, {
        actorUserId: 'user-1',
        entityType: 'Asset',
        entityId: 'asset-1',
        action: 'CREATE',
        before: null,
        after: { status: 'ACTIVE' },
        source: 'manual',
      });

      expect(manager.create).toHaveBeenCalledWith(AuditLog, {
        actorUserId: 'user-1',
        entityType: 'Asset',
        entityId: 'asset-1',
        action: 'CREATE',
        before: null,
        after: { status: 'ACTIVE' },
        source: 'manual',
      });
      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'Asset' }),
      );
      expect(result.id).toBe('audit-1');
    });

    it('defaults before/after to null when omitted', async () => {
      const manager = {
        create: jest.fn((_entity, plain) => plain),
        save: jest.fn(async (entity) => entity),
      };

      const result = await service.record(manager as any, {
        actorUserId: null,
        entityType: 'WorkOrder',
        entityId: 'wo-1',
        action: 'AUTO_CREATE',
        source: 'auto:condition-monitoring',
      });

      expect(result.before).toBeNull();
      expect(result.after).toBeNull();
      expect(result.actorUserId).toBeNull();
    });

    it('never touches the injected repo, only the caller-provided manager', async () => {
      const manager = {
        create: jest.fn((_entity, plain) => plain),
        save: jest.fn(async (entity) => entity),
      };

      await service.record(manager as any, {
        actorUserId: null,
        entityType: 'Asset',
        entityId: 'asset-2',
        action: 'UPDATE',
        source: 'manual',
      });

      expect(auditLogRepo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });
});
