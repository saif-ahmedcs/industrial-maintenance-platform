import {
  CONSECUTIVE_HOT_READINGS_REQUIRED,
  HOT_TEMPERATURE_THRESHOLD_C,
  tripsHotTemperatureRule,
} from './hot-temperature.rule';

describe('tripsHotTemperatureRule', () => {
  const hot = (temperature: number) => ({ temperature });

  it('does not trip with fewer than 3 readings', () => {
    expect(tripsHotTemperatureRule([hot(85), hot(85)])).toBe(false);
  });

  it('trips at exactly 3 consecutive hot readings', () => {
    expect(tripsHotTemperatureRule([hot(85), hot(90), hot(82)])).toBe(true);
  });

  it('does not trip when the most recent reading breaks the streak', () => {
    // Newest-first: the latest reading cooled off, even though the two
    // before it were hot — the streak must be the *current* one.
    expect(tripsHotTemperatureRule([hot(70), hot(90), hot(90)])).toBe(false);
  });

  it('ignores older readings once 3 consecutive hot readings exist', () => {
    // 5 readings, newest-first: the newest 3 are hot, the 2 behind them
    // are irrelevant to whether the rule trips right now.
    expect(
      tripsHotTemperatureRule([hot(81), hot(85), hot(90), hot(40), hot(40)]),
    ).toBe(true);
  });

  it('does not trip exactly at the threshold (strictly greater-than)', () => {
    expect(
      tripsHotTemperatureRule([
        hot(HOT_TEMPERATURE_THRESHOLD_C),
        hot(HOT_TEMPERATURE_THRESHOLD_C),
        hot(HOT_TEMPERATURE_THRESHOLD_C),
      ]),
    ).toBe(false);
  });

  it('trips just above the threshold', () => {
    const justAbove = HOT_TEMPERATURE_THRESHOLD_C + 0.1;
    expect(
      tripsHotTemperatureRule([hot(justAbove), hot(justAbove), hot(justAbove)]),
    ).toBe(true);
  });

  it('uses 3 as the consecutive-readings window', () => {
    expect(CONSECUTIVE_HOT_READINGS_REQUIRED).toBe(3);
  });
});
