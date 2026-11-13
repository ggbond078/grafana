import { TimeRange, dateTime, rangeUtil } from '@grafana/data';
import { getDataSourceSrv } from '@grafana/runtime';
import { DataQuery } from '@grafana/schema';

export const DEFAULT_LOKI_MAX_QUERY_DURATION = '30m';
const LOKI_DATASOURCE_TYPE = 'loki';
const LOKI_DURATION_PATTERN = /^\d+(?:ms|s|m|h|d|w|M|y)$/;

export interface LokiQueryTimeRangeLimit {
  maxDurationMs: number;
  maxDurationLabel: string;
}

export interface LokiTimeRangeViolation {
  durationMs: number;
  maxDurationMs: number;
  maxDurationLabel: string;
}

export interface LokiExploreQueryContext {
  datasourceType?: string;
  datasourceUid?: string;
  queries: DataQuery[];
  range: TimeRange;
}

function getLokiInstanceSettings(datasourceUid?: string) {
  if (!datasourceUid) {
    return undefined;
  }

  return getDataSourceSrv().getInstanceSettings(datasourceUid);
}

function resolveLokiQueryTimeRangeLimit(datasourceUid?: string): LokiQueryTimeRangeLimit {
  const settings = getLokiInstanceSettings(datasourceUid);
  const configuredValue = settings?.jsonData ? Reflect.get(settings.jsonData, 'maxQueryDuration') : undefined;
  const configuredDuration = typeof configuredValue === 'string' ? configuredValue.trim() : undefined;
  const maxDurationLabel = configuredDuration || DEFAULT_LOKI_MAX_QUERY_DURATION;
  if (!LOKI_DURATION_PATTERN.test(maxDurationLabel)) {
    throw new Error(
      `Invalid Loki maxQueryDuration "${maxDurationLabel}" for data source ${datasourceUid ?? 'without uid'}; use a duration with a unit such as 30m`
    );
  }
  const maxDurationMs = rangeUtil.intervalToMs(maxDurationLabel);

  if (!Number.isFinite(maxDurationMs) || maxDurationMs <= 0) {
    throw new Error(
      `Invalid Loki maxQueryDuration "${maxDurationLabel}" for data source ${datasourceUid ?? 'without uid'}`
    );
  }

  return { maxDurationMs, maxDurationLabel };
}

export function getLokiQueryTimeRangeLimit({
  datasourceType,
  datasourceUid,
  queries,
}: Omit<LokiExploreQueryContext, 'range'>): LokiQueryTimeRangeLimit | undefined {
  const limits: LokiQueryTimeRangeLimit[] = [];

  if (datasourceType === LOKI_DATASOURCE_TYPE) {
    limits.push(resolveLokiQueryTimeRangeLimit(datasourceUid));
  }

  for (const query of queries) {
    const queryDatasourceType = query.datasource?.type;
    const queryDatasourceUid = query.datasource?.uid;

    if (queryDatasourceType === LOKI_DATASOURCE_TYPE) {
      limits.push(resolveLokiQueryTimeRangeLimit(queryDatasourceUid));
    } else if (queryDatasourceUid) {
      const settings = getLokiInstanceSettings(queryDatasourceUid);
      if (settings?.type === LOKI_DATASOURCE_TYPE) {
        limits.push(resolveLokiQueryTimeRangeLimit(queryDatasourceUid));
      }
    }
  }

  if (limits.length === 0) {
    return undefined;
  }

  return limits.reduce((lowest, current) => (current.maxDurationMs < lowest.maxDurationMs ? current : lowest));
}

export function isLokiExploreQuery(context: Omit<LokiExploreQueryContext, 'range'>): boolean {
  return getLokiQueryTimeRangeLimit(context) !== undefined;
}

export function getLokiTimeRangeViolation({
  datasourceType,
  datasourceUid,
  queries,
  range,
}: LokiExploreQueryContext): LokiTimeRangeViolation | undefined {
  const limit = getLokiQueryTimeRangeLimit({ datasourceType, datasourceUid, queries });
  if (!limit) {
    return undefined;
  }

  const durationMs = range.to.valueOf() - range.from.valueOf();
  if (durationMs <= limit.maxDurationMs) {
    return undefined;
  }

  return {
    durationMs,
    maxDurationMs: limit.maxDurationMs,
    maxDurationLabel: limit.maxDurationLabel,
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
