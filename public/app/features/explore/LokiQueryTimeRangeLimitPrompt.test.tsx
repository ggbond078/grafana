import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProvider } from 'test/helpers/TestProvider';

import { dateTime, TimeRange } from '@grafana/data';
import { configureStore } from 'app/store/configureStore';
import { StoreState } from 'app/types/store';

import { LokiQueryTimeRangeLimitPrompt } from './LokiQueryTimeRangeLimitPrompt';
import { createDefaultInitialState } from './state/testHelpers';

describe('LokiQueryTimeRangeLimitPrompt', () => {
  it('narrows the selected range to the most recent 30 minutes', async () => {
    const to = dateTime('2026-11-12T12:00:00.000Z');
    const from = dateTime(to.valueOf() - 60 * 60 * 1000);
    const range: TimeRange = { from, to, raw: { from, to } };
    const store = configureStore(createDefaultInitialState().defaultInitialState as unknown as Partial<StoreState>);
    const dispatch = jest.spyOn(store, 'dispatch');

    render(
      <TestProvider store={store}>
        <LokiQueryTimeRangeLimitPrompt
          exploreId="left"
          range={range}
          timeZone="utc"
          violation={{
            durationMs: 60 * 60 * 1000,
            maxDurationMs: 30 * 60 * 1000,
            maxDurationLabel: '30m',
          }}
        />
      </TestProvider>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('60 minutes');
    await userEvent.click(screen.getByRole('button', { name: /Use last 30m/ }));

    expect(dispatch).toHaveBeenCalledWith(expect.anything());
    expect(store.getState().explore.panes.left!.range.raw.from.valueOf()).toBe(to.valueOf() - 30 * 60 * 1000);
  });
});
