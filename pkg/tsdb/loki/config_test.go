package loki

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestParseMaxQueryDuration(t *testing.T) {
	t.Run("uses 30 minutes when the setting is absent", func(t *testing.T) {
		duration, err := parseMaxQueryDuration(json.RawMessage(`{}`))

		require.NoError(t, err)
		require.Equal(t, 30*time.Minute, duration)
	})

	t.Run("parses a configured duration", func(t *testing.T) {
		duration, err := parseMaxQueryDuration(json.RawMessage(`{"maxQueryDuration":"1h"}`))

		require.NoError(t, err)
		require.Equal(t, time.Hour, duration)
	})

	t.Run("rejects an invalid duration", func(t *testing.T) {
		_, err := parseMaxQueryDuration(json.RawMessage(`{"maxQueryDuration":"not-a-duration"}`))

		require.ErrorContains(t, err, "invalid Loki maxQueryDuration")
	})

	t.Run("rejects a duration without a unit", func(t *testing.T) {
		_, err := parseMaxQueryDuration(json.RawMessage(`{"maxQueryDuration":"30"}`))

		require.ErrorContains(t, err, "use a duration with a unit")
	})

	t.Run("rejects a non-positive duration", func(t *testing.T) {
		_, err := parseMaxQueryDuration(json.RawMessage(`{"maxQueryDuration":"0s"}`))

		require.ErrorContains(t, err, "must be greater than zero")
	})
}
