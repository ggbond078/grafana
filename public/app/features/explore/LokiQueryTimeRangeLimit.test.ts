import { dateTime } from '@grafana/data';

import {
  DEFAULT_LOKI_MAX_QUERY_DURATION,
  getClampedTimeRange,
  getLokiQueryTimeRangeLimit,
  getLokiTimeRangeViolation,
  isLokiExploreQuery,
} from './LokiQueryTimeRangeLimit';

const mockGetInstanceSettings = jest.fn();

jest.mock('@grafana/runtime', () => ({
  getDataSourceSrv: () => ({
    getInstanceSettings: mockGetInstanceSettings,
  }),
}));

const createRange = (durationMs: number) => {
  const to = dateTime('2026-11-12T12:00:00.000Z');
  const from = dateTime(to.valueOf() - durationMs);
  return { from, to, raw: { from, to } };
};

describe('Loki query time range limit', () => {
  beforeEach(() => {
    mockGetInstanceSettings.mockReset();
    mockGetInstanceSettings.mockReturnValue(undefined);
  });

  it('identifies a Loki data source by root data source type', () => {
    expect(isLokiExploreQuery({ datasourceType: 'loki', queries: [] })).toBe(true);
  });

  it('identifies a Loki data source by query data source type', () => {
    expect(
      isLokiExploreQuery({
        datasourceType: 'mixed',
        queries: [{ refId: 'A', datasource: { type: 'loki', uid: 'loki-uid' } }],
      })
    ).toBe(true);
  });

  it('does not apply the limit to other data sources', () => {
    const violation = getLokiTimeRangeViolation({
      datasourceType: 'prometheus',
      queries: [],
      range: createRange(60 * 60 * 1000),
    });

    expect(violation).toBeUndefined();
  });

  it('allows a range at the 30 minute boundary', () => {
    const violation = getLokiTimeRangeViolation({
      datasourceType: 'loki',
      queries: [],
      range: createRange(30 * 60 * 1000),
    });

    expect(violation).toBeUndefined();
  });

  it('uses the Loki data source maximum query duration', () => {
    mockGetInstanceSettings.mockReturnValue({
      type: 'loki',
      uid: 'loki-1',
      jsonData: { maxQueryDuration: '1h' },
    });

    expect(
      getLokiQueryTimeRangeLimit({
        datasourceType: 'loki',
        datasourceUid: 'loki-1',
        queries: [],
      })
    ).toEqual({
      maxDurationMs: 60 * 60 * 1000,
      maxDurationLabel: '1h',
    });
  });

  it('rejects a configured duration without a unit', () => {
    mockGetInstanceSettings.mockReturnValue({
      type: 'loki',
      uid: 'loki-1',
      jsonData: { maxQueryDuration: '30' },
    });

    expect(() =>
      getLokiQueryTimeRangeLimit({
        datasourceType: 'loki',
        datasourceUid: 'loki-1',
        queries: [],
      })
    ).toThrow('use a duration with a unit');
  });

  it('blocks a range longer than 30 minutes', () => {
    const violation = getLokiTimeRangeViolation({
      datasourceType: 'loki',
      queries: [],
      range: createRange(31 * 60 * 1000),
    });

    expect(violation).toEqual({
      durationMs: 31 * 60 * 1000,
      maxDurationMs: 30 * 60 * 1000,
      maxDurationLabel: DEFAULT_LOKI_MAX_QUERY_DURATION,
    });
  });

  it('clamps a range to the most recent allowed window', () => {
    const range = createRange(90 * 60 * 1000);
    const narrowed = getClampedTimeRange(range, 30 * 60 * 1000);

    expect(narrowed.to.valueOf()).toBe(range.to.valueOf());
    expect(narrowed.from.valueOf()).toBe(range.to.valueOf() - 30 * 60 * 1000);
    expect(narrowed.raw.from).toBe(narrowed.from);
    expect(narrowed.raw.to).toBe(narrowed.to);
  });
});
