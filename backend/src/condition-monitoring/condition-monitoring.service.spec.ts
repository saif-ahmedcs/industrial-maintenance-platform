import { ConditionMonitoringService } from './condition-monitoring.service';

describe('ConditionMonitoringService', () => {
  let service: ConditionMonitoringService;
  let readingRepo: { find: jest.Mock };
  let workOrderRepo: { exists: jest.Mock };
  let dataSource: { manager: { findOne: jest.Mock }; transaction: jest.Mock };
  let auditService: { record: jest.Mock };
  let assetHistoryService: { record: jest.Mock };
  let notificationsService: { record: jest.Mock };
  let aiInsightsService: { generate: jest.Mock };

  beforeEach(() => {
    readingRepo = { find: jest.fn(async () => []) };
    workOrderRepo = { exists: jest.fn(async () => false) };
    dataSource = {
      manager: { findOne: jest.fn() },
      transaction: jest.fn(),
    };
    auditService = { record: jest.fn() };
    assetHistoryService = { record: jest.fn() };
    notificationsService = { record: jest.fn() };
    aiInsightsService = { generate: jest.fn() };

    service = new ConditionMonitoringService(
      readingRepo as any,
      workOrderRepo as any,
      dataSource as any,
      auditService as any,
      assetHistoryService as any,
      notificationsService as any,
      aiInsightsService as any,
    );
  });

  it('selects the "most recent" readings by server-assigned ingestedAt, not the publisher-controlled recordedAt', async () => {
    await service.evaluateAsset('asset-1');

    expect(readingRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { assetId: 'asset-1' },
        order: { ingestedAt: 'DESC' },
        take: 3,
      }),
    );
    const callArgs = readingRepo.find.mock.calls[0][0];
    expect(callArgs.order).not.toHaveProperty('recordedAt');
  });

  it('does nothing further once the rule does not trip', async () => {
    readingRepo.find.mockResolvedValue([
      { temperature: 50 },
      { temperature: 50 },
      { temperature: 50 },
    ]);

    await service.evaluateAsset('asset-1');

    expect(workOrderRepo.exists).not.toHaveBeenCalled();
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });
});
