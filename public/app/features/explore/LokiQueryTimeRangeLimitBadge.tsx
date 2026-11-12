import { css } from '@emotion/css';

import { GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { Icon, useStyles2 } from '@grafana/ui';

import { LOKI_MAX_QUERY_DURATION } from './LokiQueryTimeRangeLimit';

interface Props {
  exceeded: boolean;
}

export function LokiQueryTimeRangeLimitBadge({ exceeded }: Props) {
  const styles = useStyles2(getStyles);
  const label = exceeded
    ? t('explore.loki-time-limit.badge-exceeded', 'Exceeds {{limit}}', { limit: LOKI_MAX_QUERY_DURATION })
    : t('explore.loki-time-limit.badge-ok', 'Max {{limit}}', { limit: LOKI_MAX_QUERY_DURATION });

  return (
    <span
      className={`${styles.badge} ${exceeded ? styles.badgeWarning : styles.badgeSafe}`}
      aria-label={label}
      data-testid="loki-time-range-limit-badge"
    >
      <Icon name={exceeded ? 'exclamation-triangle' : 'shield'} size="xs" />
      {LOKI_MAX_QUERY_DURATION}
    </span>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  badge: css({
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: theme.shape.radius.default,
    display: 'inline-flex',
    fontSize: theme.typography.bodySmall.fontSize,
    gap: theme.spacing(0.5),
    height: theme.spacing(3),
    marginLeft: theme.spacing(0.5),
    padding: theme.spacing(0, 0.75),
    whiteSpace: 'nowrap',
  }),
  badgeSafe: css({
    background: theme.colors.success.transparent,
    color: theme.colors.success.text,
  }),
  badgeWarning: css({
    background: theme.colors.warning.transparent,
    color: theme.colors.warning.text,
  }),
});
