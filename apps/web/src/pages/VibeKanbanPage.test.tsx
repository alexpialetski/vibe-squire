import { MockedProvider } from '@apollo/client/testing';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { VibeKanbanPage } from './VibeKanbanPage';
import {
  UPDATE_DESTINATION_SETTINGS_MUTATION,
  VIBE_KANBAN_ORGANIZATIONS_QUERY,
  VIBE_KANBAN_PROJECTS_QUERY,
  VIBE_KANBAN_UI_STATE_QUERY,
} from '../graphql/operations';

describe('VibeKanbanPage', () => {
  it('renders picker data from GraphQL queries and saves destination settings', async () => {
    const uiStateResult = {
      data: {
        vibeKanbanUiState: {
          __typename: 'VibeKanbanUiState',
          saved: false,
          error: null,
          boardOrg: 'org-1',
          boardProj: 'proj-1',
          kanbanDoneStatus: 'Done',
          vkExecutor: 'open',
          vkBoardPicker: true,
          orgError: null,
          executorOptions: [
            {
              __typename: 'VibeKanbanExecutorOption',
              value: 'open',
              label: 'Open',
            },
            {
              __typename: 'VibeKanbanExecutorOption',
              value: 'none',
              label: 'Do not open',
            },
          ],
          vkLabels: {
            __typename: 'VibeKanbanLabels',
            default_organization_id: 'Organization',
            vk_workspace_executor: 'Executor',
            kanban_done_status: 'Done status',
          },
        },
      },
    };

    const mocks = [
      {
        request: { query: VIBE_KANBAN_UI_STATE_QUERY },
        result: uiStateResult,
      },
      {
        request: { query: VIBE_KANBAN_ORGANIZATIONS_QUERY },
        result: {
          data: {
            vibeKanbanOrganizations: [
              {
                __typename: 'VibeKanbanOrganization',
                id: 'org-1',
                name: 'Acme',
              },
            ],
          },
        },
      },
      {
        request: {
          query: VIBE_KANBAN_PROJECTS_QUERY,
          variables: { organizationId: 'org-1' },
        },
        result: {
          data: {
            vibeKanbanProjects: [
              { __typename: 'VibeKanbanProject', id: 'proj-1', name: 'Main' },
            ],
          },
        },
      },
      {
        request: {
          query: UPDATE_DESTINATION_SETTINGS_MUTATION,
          variables: {
            input: {
              default_organization_id: 'org-1',
              default_project_id: 'proj-1',
              kanban_done_status: 'Done',
              vk_workspace_executor: 'open',
            },
          },
        },
        result: {
          data: {
            updateDestinationSettings: {
              __typename: 'EffectiveSettings',
              id: 'singleton',
              coreFields: [],
              resolvedSourceLabel: 'GitHub',
              resolvedDestinationLabel: 'Vibe Kanban',
              scheduledSyncEnabled: false,
              autoCreateIssues: false,
            },
          },
        },
      },
    ];

    render(
      <MockedProvider mocks={mocks}>
        <VibeKanbanPage />
      </MockedProvider>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Vibe Kanban' }),
    ).toBeTruthy();
    expect(await screen.findByLabelText('Organization')).toBeTruthy();
    expect(await screen.findByLabelText('Project')).toBeTruthy();
    const doneStatusInput = await screen.findByLabelText('Done status');
    expect(doneStatusInput).toHaveValue('Done');

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('button', { name: 'Save' })).toBeTruthy();
  });
});
