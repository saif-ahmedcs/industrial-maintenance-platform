import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AI_NOTE_MAX_LENGTH, AiInsightsService } from './ai-insights.service';
import { LowStockContext } from './diagnostic-context';

const context: LowStockContext = {
  kind: 'LOW_STOCK',
  partName: 'Bearing 6205',
  sku: 'BRG-6205',
  quantityOnHand: 2,
  reorderThreshold: 5,
};

function makeService(
  env: Record<string, unknown>,
  generate: jest.Mock,
): AiInsightsService {
  const config = { get: (key: string) => env[key] } as unknown as ConfigService;
  return new AiInsightsService(config, { generate });
}

describe('AiInsightsService', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('returns null and makes zero provider calls when disabled', async () => {
    const generate = jest.fn();
    const service = makeService({ AI_INSIGHTS_ENABLED: false }, generate);

    await expect(service.generate(context)).resolves.toBeNull();
    expect(generate).not.toHaveBeenCalled();
  });

  it('treats a missing AI_INSIGHTS_ENABLED as disabled', async () => {
    const generate = jest.fn();
    const service = makeService({}, generate);

    await expect(service.generate(context)).resolves.toBeNull();
    expect(generate).not.toHaveBeenCalled();
  });

  it('returns the trimmed note when enabled and the provider succeeds', async () => {
    const generate = jest.fn().mockResolvedValue('  Possible bearing wear.  ');
    const service = makeService({ AI_INSIGHTS_ENABLED: 'true' }, generate);

    await expect(service.generate(context)).resolves.toBe(
      'Possible bearing wear.',
    );
    expect(generate).toHaveBeenCalledWith(
      context,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('hard-truncates an over-long note', async () => {
    const generate = jest.fn().mockResolvedValue('x'.repeat(2000));
    const service = makeService({ AI_INSIGHTS_ENABLED: true }, generate);

    const note = await service.generate(context);
    expect(note).toHaveLength(AI_NOTE_MAX_LENGTH);
  });

  it('returns null (not a throw) when the provider returns only whitespace', async () => {
    const generate = jest.fn().mockResolvedValue('   ');
    const service = makeService({ AI_INSIGHTS_ENABLED: true }, generate);

    await expect(service.generate(context)).resolves.toBeNull();
  });

  it('returns null and logs a warning when the provider throws (HTTP error)', async () => {
    const generate = jest
      .fn()
      .mockRejectedValue(new Error('Groq responded with HTTP 500'));
    const service = makeService({ AI_INSIGHTS_ENABLED: true }, generate);

    await expect(service.generate(context)).resolves.toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('HTTP 500'));
  });

  it('returns null on timeout and aborts the in-flight request', async () => {
    let receivedSignal: AbortSignal | undefined;
    const generate = jest.fn(
      (_ctx: unknown, opts?: { signal?: AbortSignal }) => {
        receivedSignal = opts?.signal;
        return new Promise<string>(() => undefined);
      },
    );
    const service = makeService(
      { AI_INSIGHTS_ENABLED: true, AI_INSIGHTS_TIMEOUT_MS: 50 },
      generate,
    );

    await expect(service.generate(context)).resolves.toBeNull();
    expect(receivedSignal?.aborted).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('timed out'));
  });
});
