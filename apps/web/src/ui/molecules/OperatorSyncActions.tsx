import { useMutation, useQuery } from '@apollo/client';
import { statusSnapshotSchema } from '@vibe-squire/shared';
import { toast } from 'react-hot-toast';
import { parseGraphqlOperatorActionError } from '../../graphql/operator-action-errors';
import {
  ACTIVITY_FEED_QUERY,
  EFFECTIVE_SETTINGS_QUERY,
  INTEGRATION_NAV_QUERY,
  MAPPINGS_QUERY,
  REINIT_INTEGRATION_MUTATION,
  STATUS_QUERY,
  TRIGGER_SYNC_MUTATION,
} from '../../graphql/operations';
import { dashboardNeedsReinit } from '../../operator/sync-health';
const FEED_VARS = { first: 40 } as const;

const REFETCH_AFTER_OPERATOR_ACTION = [
  { query: STATUS_QUERY },
  { query: ACTIVITY_FEED_QUERY, variables: FEED_VARS },
  { query: EFFECTIVE_SETTINGS_QUERY },
  { query: MAPPINGS_QUERY },
  { query: INTEGRATION_NAV_QUERY },
] as const;

export function OperatorSyncActions() {
  const statusQ = useQuery(STATUS_QUERY, { fetchPolicy: 'cache-first' });

  const snapshot = (() => {
    const raw = statusQ.data?.status;
    if (!raw) {
      return null;
    }
    const parsed = statusSnapshotSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  })();

  const manualSync = snapshot?.manual_sync ?? {
    canRun: false as const,
    reason: undefined as string | undefined,
    cooldownUntil: undefined as string | undefined,
  };

  const [triggerSync, { loading: syncPending }] = useMutation(
    TRIGGER_SYNC_MUTATION,
    {
      refetchQueries: [...REFETCH_AFTER_OPERATOR_ACTION],
      awaitRefetchQueries: true,
      onCompleted: () => {
        toast.success('Sync finished.');
      },
      onError: (e) => {
        toast.error(`Sync failed: ${parseGraphqlOperatorActionError(e)}`);
      },
    },
  );

  const [reinitIntegration, { loading: reinitPending }] = useMutation(
    REINIT_INTEGRATION_MUTATION,
    {
      refetchQueries: [...REFETCH_AFTER_OPERATOR_ACTION],
      awaitRefetchQueries: true,
      onCompleted: () => {
        toast.success('Reinit completed.');
      },
      onError: (e) => {
        toast.error(`Reinit failed: ${parseGraphqlOperatorActionError(e)}`);
      },
    },
  );

  const showReinit = snapshot ? dashboardNeedsReinit(snapshot) : false;

  return (
    <div className="actions-row operator-head-actions">
      <button
        type="button"
        className="btn primary btn-sm"
        disabled={!manualSync.canRun || syncPending}
        onClick={() => {
          void triggerSync();
        }}
      >
        {syncPending ? 'Syncing…' : 'Sync now'}
      </button>
      {showReinit ? (
        <button
          type="button"
          className="btn ghost btn-sm"
          disabled={reinitPending}
          onClick={() => {
            if (
              !confirm(
                'Run soft reinit? This refreshes settings, rescans checks, clears scout backoff, and reschedules sync.',
              )
            ) {
              return;
            }
            void reinitIntegration();
          }}
        >
          {reinitPending ? 'Reinit…' : 'Reinit'}
        </button>
      ) : null}
    </div>
  );
}
