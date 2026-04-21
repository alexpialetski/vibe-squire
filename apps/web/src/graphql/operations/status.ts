import { gql } from '@apollo/client';
import { statusSnapshotSchema } from '@vibe-squire/shared';
import type { z } from 'zod';

type StatusSnapshot = z.infer<typeof statusSnapshotSchema>;

export type StatusQueryData = {
  status: StatusSnapshot;
};

export type StatusUpdatedSubscriptionData = {
  statusUpdated: StatusSnapshot;
};

const FULL_STATUS_SNAPSHOT_FRAGMENT = gql`
  fragment FullStatusSnapshot on StatusSnapshot {
    timestamp
    pending_triage_count
    gh {
      state
      message
    }
    database {
      state
      message
    }
    setup {
      complete
      mappingCount
      reason
    }
    configuration {
      source_type
      destination_type
      vibe_kanban_board_active
    }
    destinations {
      id
      state
      lastOkAt
      message
    }
    scouts {
      id
      state
      lastPollAt
      nextPollAt
      lastError
      skipReason
      last_poll {
        candidates_count
        skipped_unmapped
        issues_created
      }
    }
    manual_sync {
      canRun
      reason
      cooldownUntil
    }
    scheduled_sync {
      enabled
    }
  }
`;

export const STATUS_QUERY = gql`
  query StatusQuery {
    status {
      ...FullStatusSnapshot
    }
  }
  ${FULL_STATUS_SNAPSHOT_FRAGMENT}
`;

export const STATUS_UPDATED_SUBSCRIPTION = gql`
  subscription StatusUpdatedSubscription {
    statusUpdated {
      ...FullStatusSnapshot
    }
  }
  ${FULL_STATUS_SNAPSHOT_FRAGMENT}
`;
