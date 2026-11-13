package loki

import (
	"context"
	"net/http"
	"testing"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/tracing"
	"github.com/stretchr/testify/require"
)

func TestValidateQueryTimeRange(t *testing.T) {
	query := &lokiQuery{
		QueryType: QueryTypeRange,
		Start:     time.Unix(0, 0),
		End:       time.Unix(0, 0).Add(30 * time.Minute),
	}

	require.NoError(t, validateQueryTimeRange(query, 30*time.Minute))

	query.End = query.Start.Add(30*time.Minute + 36*time.Millisecond)
	require.NoError(t, validateQueryTimeRange(query, 30*time.Minute))

	query.End = query.Start.Add(30*time.Minute + 2*time.Second)
	require.ErrorContains(t, validateQueryTimeRange(query, 30*time.Minute), "exceeds the configured maximum")

	query.End = query.Start.Add(31 * time.Minute)
	require.ErrorContains(t, validateQueryTimeRange(query, 30*time.Minute), "exceeds the configured maximum")
}

func TestExecuteQueryBlocksLongRangeBeforeRequest(t *testing.T) {
	called := false
	api := makeMockedAPI(http.StatusOK, "application/json", []byte(`{"status":"success","data":{"resultType":"matrix","result":[]}}`), func(req *http.Request) {
		called = true
	})
	query := &lokiQuery{
		Expr:      `{job="test"}`,
		QueryType: QueryTypeRange,
		Start:     time.Unix(0, 0),
		End:       time.Unix(0, 0).Add(31 * time.Minute),
	}

	response := executeQuery(
		context.Background(),
		query,
		&backend.QueryDataRequest{},
		false,
		api,
		ResponseOpts{},
		tracing.DefaultTracer(),
		backend.NewLoggerWith("logger", "test"),
		30*time.Minute,
	)

	require.False(t, called)
	require.ErrorContains(t, response.Error, "exceeds the configured maximum")
}
