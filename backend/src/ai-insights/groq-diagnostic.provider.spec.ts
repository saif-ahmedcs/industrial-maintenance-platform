import { ConfigService } from '@nestjs/config';
import { HotTemperatureContext, LowStockContext } from './diagnostic-context';
import {
  GROQ_CHAT_COMPLETIONS_URL,
  GROQ_MAX_TOKENS,
  GroqDiagnosticProvider,
} from './groq-diagnostic.provider';

const hotContext: HotTemperatureContext = {
  kind: 'HOT_TEMPERATURE',
  asset: { tag: 'PUMP-01', typeName: 'Centrifugal Pump', criticality: 'HIGH' },
  thresholdC: 80,
  readings: [
    {
      temperature: 84,
      vibration: 2.3,
      pressure: 6.0,
      recordedAt: new Date('2026-09-28T10:00:02.000Z'),
    },
    {
      temperature: 83,
      vibration: 2.2,
      pressure: 6.0,
      recordedAt: new Date('2026-09-28T10:00:01.000Z'),
    },
    {
      temperature: 82,
      vibration: 2.2,
      pressure: 6.1,
      recordedAt: new Date('2026-09-28T10:00:00.000Z'),
    },
  ],
};

const lowStockContext: LowStockContext = {
  kind: 'LOW_STOCK',
  partName: 'Bearing 6205',
  sku: 'BRG-6205',
  quantityOnHand: 2,
  reorderThreshold: 5,
};

function makeConfig(values: Record<string, string | undefined>) {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

describe('GroqDiagnosticProvider', () => {
  let fetchSpy: jest.SpyInstance;
  const provider = new GroqDiagnosticProvider(
    makeConfig({ GROQ_API_KEY: 'gsk_test', GROQ_MODEL: 'test-model' }),
  );

  beforeEach(() => {
    fetchSpy = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  const okResponse = (content: unknown) =>
    new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
      status: 200,
    });

  it('builds the expected request body for a hot-temperature context', () => {
    const body = provider.buildRequestBody(hotContext);

    expect(body.model).toBe('test-model');
    expect(body.max_tokens).toBe(GROQ_MAX_TOKENS);
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[0].content).toContain('possible');
    expect(body.messages[1].role).toBe('user');
    expect(body.messages[1].content).toContain('PUMP-01');
    expect(body.messages[1].content).toContain('Centrifugal Pump');
    expect(body.messages[1].content).toContain('exceeded 80 C');
    expect(body.messages[1].content).toContain('temperature 84 C');
  });

  it('builds a low-stock prompt without any asset information', () => {
    const body = provider.buildRequestBody(lowStockContext);
    expect(body.messages[1].content).toContain('BRG-6205');
    expect(body.messages[1].content).toContain('2 on hand, threshold 5');
  });

  it('POSTs to Groq with the bearer key and returns the message content', async () => {
    fetchSpy.mockResolvedValue(okResponse('Possible bearing wear.'));
    const controller = new AbortController();

    const note = await provider.generate(hotContext, {
      signal: controller.signal,
    });

    expect(note).toBe('Possible bearing wear.');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(GROQ_CHAT_COMPLETIONS_URL);
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer gsk_test');
    expect(init.signal).toBe(controller.signal);
    expect(JSON.parse(init.body).model).toBe('test-model');
  });

  it('throws on a non-2xx response', async () => {
    fetchSpy.mockResolvedValue(new Response('{}', { status: 500 }));
    await expect(provider.generate(hotContext)).rejects.toThrow('HTTP 500');
  });

  it('throws on an empty or malformed response body', async () => {
    fetchSpy.mockResolvedValue(okResponse('   '));
    await expect(provider.generate(hotContext)).rejects.toThrow('malformed');

    fetchSpy.mockResolvedValue(new Response('{}', { status: 200 }));
    await expect(provider.generate(hotContext)).rejects.toThrow('malformed');
  });

  it('throws without calling the network when no API key is configured', async () => {
    const noKey = new GroqDiagnosticProvider(makeConfig({}));
    await expect(noKey.generate(hotContext)).rejects.toThrow('GROQ_API_KEY');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
