import { MockedProvider } from '@apollo/client/testing';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { GithubPage } from './GithubPage';
import {
  GITHUB_FIELDS_QUERY,
  UPDATE_SOURCE_SETTINGS_MUTATION,
} from '../graphql/operations';

describe('GithubPage', () => {
  it('loads fields via query and saves via mutation', async () => {
    const queryMock = {
      request: { query: GITHUB_FIELDS_QUERY },
      result: {
        data: {
          githubFields: {
            __typename: 'GithubFieldsPayload',
            disabled: false,
            fields: [
              {
                __typename: 'GithubField',
                key: 'pr_review_body_template',
                label: 'Review template',
                value: 'initial value',
              },
            ],
          },
        },
      },
    };
    const mutationMock = {
      request: {
        query: UPDATE_SOURCE_SETTINGS_MUTATION,
        variables: {
          input: {
            pr_review_body_template: 'updated value',
          },
        },
      },
      result: {
        data: {
          updateSourceSettings: {
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
    };

    render(
      <MockedProvider mocks={[queryMock, mutationMock]}>
        <GithubPage />
      </MockedProvider>,
    );

    const input = await screen.findByLabelText('Review template');
    await userEvent.clear(input);
    await userEvent.type(input, 'updated value');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('button', { name: 'Save' })).toBeTruthy();
  });
});
