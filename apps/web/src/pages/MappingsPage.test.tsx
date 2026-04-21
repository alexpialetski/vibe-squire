import { MockedProvider } from '@apollo/client/testing';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MappingsPage } from './MappingsPage';
import { MAPPINGS_QUERY, VIBE_KANBAN_REPOS_QUERY } from '../graphql/operations';

vi.mock('../ui/molecules/OperatorSyncActions', () => ({
  OperatorSyncActions: () => <div data-testid="operator-actions" />,
}));

describe('MappingsPage', () => {
  it('loads Vibe Kanban repositories from GraphQL for new mapping picker', async () => {
    const mocks = [
      {
        request: { query: MAPPINGS_QUERY },
        result: { data: { mappings: [] } },
      },
      {
        request: { query: VIBE_KANBAN_REPOS_QUERY },
        result: {
          data: {
            vibeKanbanRepos: [
              { __typename: 'VibeKanbanRepo', id: 'repo-1', name: 'Acme Repo' },
            ],
          },
        },
      },
    ];

    render(
      <MockedProvider mocks={mocks}>
        <MappingsPage />
      </MockedProvider>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Mappings' }),
    ).toBeTruthy();
    expect(await screen.findByLabelText('Kanban repository')).toBeTruthy();
    expect(
      await screen.findByRole('option', { name: 'Acme Repo' }),
    ).toBeTruthy();
  });
});
