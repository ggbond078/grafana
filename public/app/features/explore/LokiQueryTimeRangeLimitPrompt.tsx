import { css } from '@emotion/css';

import { GrafanaTheme2, TimeRange, dateTimeFormat } from '@grafana/data';
import { t } from '@grafana/i18n';
import { Button, Icon, Stack, useStyles2 } from '@grafana/ui';
import { useDispatch } from 'app/types/store';

import { getClampedTimeRange, LokiTimeRangeViolation } from './LokiQueryTimeRangeLimit';
import { updateTimeRange } from './state/time';

interface Props {
  exploreId: string;
  range: TimeRange;
  timeZone: string;
  violation: LokiTimeRangeViolation;
}

export function LokiQueryTimeRangeLimitPrompt({ exploreId, range, timeZone, violation }: Props) {
  const dispatch = useDispatch();
  const styles = useStyles2(getStyles);
  const durationMinutes = Math.ceil(violation.durationMs / 60000);
  const selectedRange = `${dateTimeFormat(range.from, { timeZone })} – ${dateTimeFormat(range.to, { timeZone })}`;

  const narrowRange = () => {
    dispatch(
      updateTimeRange({
        exploreId,
        rawRange: getClampedTimeRange(range, violation.maxDurationMs).raw,
      })
    );
  };

  return (
    <div className={styles.banner} role="alert" data-testid="loki-time-range-limit-prompt">
      <Stack direction="row" alignItems="center" gap={1} wrap="wrap">
        <Icon name="exclamation-triangle" size="sm" />
        <span className={styles.message}>
          {t(
            'explore.loki-time-limit.prompt',
            'Query blocked: {{duration}} minutes exceeds the {{limit}} limit. Narrow the time range to continue.',
            { duration: durationMinutes, limit: violation.maxDurationLabel }
          )}
        </span>
        <span className={styles.range}>{selectedRange}</span>
      </Stack>
      <Button variant="primary" size="sm" icon="clock-nine" onClick={narrowRange}>
        {t('explore.loki-time-limit.narrow', 'Use last {{limit}}', { limit: violation.maxDurationLabel })}
      </Button>
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  banner: css({
    alignItems: 'center',
    background: theme.colors.warning.transparent,
    border: `1px solid ${theme.colors.warning.border}`,
    borderLeft: `3px solid ${theme.colors.warning.border}`,
    borderRadius: theme.shape.radius.default,
    color: theme.colors.warning.text,
    display: 'flex',
    gap: theme.spacing(1),
    justifyContent: 'space-between',
    margin: theme.spacing(0, 1, 1, 2),
    padding: theme.spacing(1, 1.5),
  }),
  message: css({
    fontSize: theme.typography.bodySmall.fontSize,
  }),
  range: css({
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
  }),
});
