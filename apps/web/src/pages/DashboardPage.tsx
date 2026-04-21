import { useQuery as useApolloQuery, useSubscription } from '@apollo/client';
import {
  useMutation,
  useQuery as useTanstackQuery,
} from '@tanstack/react-query';
import {
  setupApiResponseSchema,
  type StatusSnapshot,
} from '@vibe-squire/shared';
import { toast } from 'react-hot-toast';
import { apiJson } from '../api';
import {
  STATUS_QUERY,
  STATUS_UPDATED_SUBSCRIPTION,
  type StatusQueryData,
  type StatusUpdatedSubscriptionData,
} from '../graphql';
import { getErrorMessage } from '../toast';
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

function parseDashboardActionError(status: number, text: string): string {
  if (!text.trim()) {
    return `HTTP ${status}`;
  }

  try {
    const parsed = JSON.parse(text) as {
      message?: string;
      reason?: string;
      cooldownUntil?: string;
      error?: string;
    };
    if (
      parsed.reason === 'cooldown' &&
      typeof parsed.cooldownUntil === 'string' &&
      parsed.cooldownUntil.length > 0
    ) {
      return `Cooldown active until ${parsed.cooldownUntil}`;
    }
    if (typeof parsed.message === 'string' && parsed.message.length > 0) {
      return parsed.message;
    }
    if (typeof parsed.reason === 'string' && parsed.reason.length > 0) {
      return parsed.reason;
    }
    if (typeof parsed.error === 'string' && parsed.error.length > 0) {
      return parsed.error;
    }
  } catch {
    // Fall through to plain text.
  }

  return text;
}

/** Matches legacy dashboard: show recovery reinit when core checks look unhealthy. */
function dashboardNeedsReinit(snapshot: StatusSnapshot): boolean {
  if (snapshot.database.state === 'error') {
    return true;
  }
  const { state: ghState } = snapshot.gh;
  if (ghState && ghState !== 'ok') {
    return true;
  }
  const dest0 = snapshot.destinations[0];
  if (dest0 && (dest0.state === 'degraded' || dest0.state === 'error')) {
    return true;
  }
  const scout0 = snapshot.scouts[0];
  if (scout0?.state === 'error') {
    return true;
  }
  return false;
}

export function DashboardPage() {
  const statusQ = useApolloQuery<StatusQueryData>(STATUS_QUERY);

  useSubscription<StatusUpdatedSubscriptionData>(STATUS_UPDATED_SUBSCRIPTION, {
    onData: ({ data, client }) => {
      const snapshot = data.data?.statusUpdated;
      if (!snapshot) {
        return;
      }
      client.writeQuery({
        query: STATUS_QUERY,
        data: { status: snapshot },
      });
    },
  });

  const setupQ = useTanstackQuery({
    queryKey: ['ui', 'setup'],
    queryFn: async () => {
      const data = await apiJson<unknown>('/api/ui/setup');
      return setupApiResponseSchema.parse(data);
    },
  });

  const syncNow = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/sync/run', { method: 'POST' });
      const text = await response.text();
      if (!response.ok) {
        throw new Error(parseDashboardActionError(response.status, text));
      }
    },
    onSuccess: async () => {
      toast.success('Sync finished.');
      await statusQ.refetch();
      await setupQ.refetch();
    },
    onError: (error) => {
      toast.error(`Sync failed: ${getErrorMessage(error)}`);
    },
  });

  const reinit = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/reinit', { method: 'POST' });
      const text = await response.text();
      if (!response.ok) {
        throw new Error(parseDashboardActionError(response.status, text));
      }
    },
    onSuccess: async () => {
      toast.success('Reinit completed.');
      await statusQ.refetch();
      await setupQ.refetch();
    },
    onError: (error) => {
      toast.error(`Reinit failed: ${getErrorMessage(error)}`);
    },
  });

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

  const snapshot = statusQ.data.status;

  const showReinit = dashboardNeedsReinit(snapshot);

  return (
    <DashboardTemplate
      headActions={
        showReinit ? (
          <button
            type="button"
            className="btn ghost btn-sm"
            disabled={reinit.isPending}
            onClick={() => {
              if (
                !confirm(
                  'Run soft reinit? This refreshes settings, rescans checks, clears scout backoff, and reschedules sync.',
                )
              ) {
                return;
              }
              reinit.mutate();
            }}
          >
            {reinit.isPending ? 'Reinit…' : 'Reinit'}
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
            onSyncNow={() => syncNow.mutate()}
            syncNowPending={syncNow.isPending}
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
          items={setupQ.data?.checklist}
        />
      }
    />
  );
}
