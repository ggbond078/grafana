import { TimeRange, dateTime, rangeUtil } from '@grafana/data';
import { getDataSourceSrv } from '@grafana/runtime';
import { DataQuery } from '@grafana/schema';

export const LOKI_MAX_QUERY_DURATION = '30m';
const LOKI_MAX_QUERY_DURATION_MS = rangeUtil.intervalToMs(LOKI_MAX_QUERY_DURATION);
const LOKI_DATASOURCE_TYPE = 'loki';

export interface LokiTimeRangeViolation {
  durationMs: number;
  maxDurationMs: number;
  maxDurationLabel: string;
}

export interface LokiExploreQueryContext {
  datasourceType?: string;
  queries: DataQuery[];
  range: TimeRange;
}

export function isLokiExploreQuery({ datasourceType, queries }: Omit<LokiExploreQueryContext, 'range'>): boolean {
  if (datasourceType === LOKI_DATASOURCE_TYPE) {
    return true;
  }

  return queries.some((query) => {
    if (query.datasource?.type === LOKI_DATASOURCE_TYPE) {
      return true;
    }

    const datasourceUid = query.datasource?.uid;
    return datasourceUid ? getDataSourceSrv().getInstanceSettings(datasourceUid)?.type === LOKI_DATASOURCE_TYPE : false;
  });
}

export function getLokiTimeRangeViolation({
  datasourceType,
  queries,
  range,
}: LokiExploreQueryContext): LokiTimeRangeViolation | undefined {
  if (!isLokiExploreQuery({ datasourceType, queries })) {
    return undefined;
  }

  const durationMs = range.to.valueOf() - range.from.valueOf();
  if (durationMs <= LOKI_MAX_QUERY_DURATION_MS) {
    return undefined;
  }

  return {
    durationMs,
    maxDurationMs: LOKI_MAX_QUERY_DURATION_MS,
    maxDurationLabel: LOKI_MAX_QUERY_DURATION,
  };
}

export function getClampedTimeRange(range: TimeRange, maxDurationMs: number): TimeRange {
  const to = range.to;
  const from = dateTime(to.valueOf() - maxDurationMs);

  return {
    ...range,
    from,
    to,
    raw: {
      from,
      to,
    },
  };
}
