package loki

import (
	"bytes"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/gtime"
)

const defaultMaxQueryDuration = 30 * time.Minute

var maxQueryDurationPattern = regexp.MustCompile(`^\d+(?:ms|s|m|h|d|w|M|y)$`)

type lokiDataSourceJSONData struct {
	MaxQueryDuration string `json:"maxQueryDuration"`
}

func parseMaxQueryDuration(raw json.RawMessage) (time.Duration, error) {
	trimmed := bytes.TrimSpace(raw)
	if len(trimmed) == 0 || bytes.Equal(trimmed, []byte("null")) {
		return defaultMaxQueryDuration, nil
	}

	var settings lokiDataSourceJSONData
	if err := json.Unmarshal(trimmed, &settings); err != nil {
		return 0, backend.DownstreamError(fmt.Errorf("failed to parse Loki data source settings: %w", err))
	}

	configuredDuration := strings.TrimSpace(settings.MaxQueryDuration)
	if configuredDuration == "" {
		return defaultMaxQueryDuration, nil
	}
	if !maxQueryDurationPattern.MatchString(configuredDuration) {
		return 0, backend.DownstreamError(
			fmt.Errorf(
				"invalid Loki maxQueryDuration %q in data source settings; use a duration with a unit such as 30m",
				configuredDuration,
			),
		)
	}

	maxQueryDuration, err := gtime.ParseDuration(configuredDuration)
	if err != nil {
		return 0, backend.DownstreamError(
			fmt.Errorf("invalid Loki maxQueryDuration %q in data source settings: %w", configuredDuration, err),
		)
	}
	if maxQueryDuration <= 0 {
		return 0, backend.DownstreamError(
			fmt.Errorf("Loki maxQueryDuration must be greater than zero, got %q", configuredDuration),
		)
	}

	return maxQueryDuration, nil
}
