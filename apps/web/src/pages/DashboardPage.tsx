import { useMutation, useQuery as useApolloQuery } from '@apollo/client';
import { type StatusSnapshot } from '@vibe-squire/shared';
import { toast } from 'react-hot-toast';
import { parseGraphqlOperatorActionError } from '../graphql/operator-action-errors';
import {
  DASHBOARD_SETUP_QUERY,
  REINIT_INTEGRATION_MUTATION,
  STATUS_QUERY,
  TRIGGER_SYNC_MUTATION,
  type StatusQueryData,
} from '../graphql';
import { dashboardNeedsReinit } from '../operator/sync-health';
import { LoadingLine } from '../ui/atoms/LoadingLine';
import { CardSection } from '../ui/molecules/CardSection';
import { ConfigurationCard } from '../ui/organisms/ConfigurationCard';
import { DatabaseStatusCard } from '../ui/organisms/DatabaseStatusCard';
import { DestinationList } from '../ui/organisms/DestinationList';
import { GhStatusCard } from '../ui/organisms/GhStatusCard';
import { ManualSyncCallout } from '../ui/organisms/ManualSyncCallout';
import { ScheduledSyncIndicator } from '../ui/organisms/ScheduledSyncIndicator';
import { ScoutList } from '../ui/organisms/ScoutList';
import { SetupChecklistCard } from '../ui/organisms/SetupChecklistCard';
import { DashboardTemplate } from '../ui/templates/DashboardTemplate';

export function DashboardPage() {
  const statusQ = useApolloQuery<StatusQueryData>(STATUS_QUERY);
  const setupQ = useApolloQuery(DASHBOARD_SETUP_QUERY);

  const [triggerSync, { loading: syncNowPending }] = useMutation(
    TRIGGER_SYNC_MUTATION,
    {
      refetchQueries: [
        { query: STATUS_QUERY },
        { query: DASHBOARD_SETUP_QUERY },
      ],
      awaitRefetchQueries: true,
      onCompleted: () => {
        toast.success('Sync finished.');
      },
      onError: (error) => {
        toast.error(`Sync failed: ${parseGraphqlOperatorActionError(error)}`);
      },
    },
  );

  const [reinitIntegration, { loading: reinitPending }] = useMutation(
    REINIT_INTEGRATION_MUTATION,
    {
      refetchQueries: [
        { query: STATUS_QUERY },
        { query: DASHBOARD_SETUP_QUERY },
      ],
      awaitRefetchQueries: true,
      onCompleted: () => {
        toast.success('Reinit completed.');
      },
      onError: (error) => {
        toast.error(`Reinit failed: ${parseGraphqlOperatorActionError(error)}`);
      },
    },
  );

  if (statusQ.loading && !statusQ.data && !statusQ.error) {
    return (
      <DashboardTemplate
        overview={
          <CardSection title="Loading">
            <div className="ui-skeleton-stack">
              <LoadingLine width="72%" />
              <LoadingLine width="58%" />
              <LoadingLine width="44%" />
            </div>
          </CardSection>
        }
        sync={
          <CardSection title="Loading">
            <div className="ui-skeleton-stack">
              <LoadingLine width="56%" />
              <LoadingLine width="38%" />
            </div>
          </CardSection>
        }
        health={
          <CardSection title="Loading">
            <div className="ui-skeleton-stack">
              <LoadingLine width="82%" />
              <LoadingLine width="68%" />
              <LoadingLine width="52%" />
            </div>
          </CardSection>
        }
        setup={
          <CardSection title="Loading">
            <div className="ui-skeleton-stack">
              <LoadingLine width="64%" />
              <LoadingLine width="48%" />
            </div>
          </CardSection>
        }
      />
    );
  }

  if (statusQ.error || !statusQ.data?.status) {
    return (
      <DashboardTemplate
        overview={
          <CardSection title="Status unavailable">
            <p>Failed to load dashboard status snapshot.</p>
          </CardSection>
        }
      />
    );
  }

  const snapshot = statusQ.data.status as StatusSnapshot;

  const showReinit = dashboardNeedsReinit(snapshot);

  return (
    <DashboardTemplate
      headActions={
        showReinit ? (
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
        ) : null
      }
      overview={
        <>
          <GhStatusCard status={snapshot.gh} />
          <DatabaseStatusCard status={snapshot.database} />
          <ConfigurationCard configuration={snapshot.configuration} />
        </>
      }
      sync={
        <>
          <ManualSyncCallout
            manualSync={snapshot.manual_sync}
            onSyncNow={() => {
              void triggerSync();
            }}
            syncNowPending={syncNowPending}
          />
          <ScheduledSyncIndicator scheduledSync={snapshot.scheduled_sync} />
        </>
      }
      health={
        <>
          <DestinationList destinations={snapshot.destinations} />
          <ScoutList scouts={snapshot.scouts} />
        </>
      }
      setup={
        <SetupChecklistCard
          setup={snapshot.setup}
          items={setupQ.data?.dashboardSetup.checklist.map((row) => ({
            text: row.text,
            ...(row.linkHref ? { linkHref: row.linkHref } : {}),
            ...(row.linkLabel ? { linkLabel: row.linkLabel } : {}),
          }))}
        />
      }
    />
  );
}
