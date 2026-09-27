/**
 * Polls `fn` until it returns a truthy value or `timeoutMs` elapses.
 * Used throughout the e2e suite for MQTT/queue-driven side effects: a
 * publish or an enqueue returns immediately, well before the consumer has
 * actually processed the message.
 */
export async function poll<T>(
  fn: () => Promise<T | null>,
  {
    timeoutMs = 8000,
    intervalMs = 200,
  }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<T> {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const result = await fn();
    if (result) {
      return result;
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error('Timed out waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
