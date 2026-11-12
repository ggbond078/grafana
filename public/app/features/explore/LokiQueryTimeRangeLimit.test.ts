import { dateTime } from '@grafana/data';

import {
  getClampedTimeRange,
  getLokiTimeRangeViolation,
  isLokiExploreQuery,
  LOKI_MAX_QUERY_DURATION,
} from './LokiQueryTimeRangeLimit';

const createRange = (durationMs: number) => {
  const to = dateTime('2026-11-12T12:00:00.000Z');
  const from = dateTime(to.valueOf() - durationMs);
  return { from, to, raw: { from, to } };
};

describe('Loki query time range limit', () => {
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

  it('blocks a range longer than 30 minutes', () => {
    const violation = getLokiTimeRangeViolation({
      datasourceType: 'loki',
      queries: [],
      range: createRange(31 * 60 * 1000),
    });

    expect(violation).toEqual({
      durationMs: 31 * 60 * 1000,
      maxDurationMs: 30 * 60 * 1000,
      maxDurationLabel: LOKI_MAX_QUERY_DURATION,
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
