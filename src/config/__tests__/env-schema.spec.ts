import { ZodError } from 'zod';
import { parseAppEnv } from '../env-schema';

describe('parseAppEnv', () => {
  it('defaults SOURCE_TYPE and DESTINATION_TYPE when unset', () => {
    const env = parseAppEnv({
      DATABASE_URL: 'file:./tmp-parse-app-env-test.db',
    });
    expect(env.sourceType).toBe('github');
    expect(env.destinationType).toBe('vibe_kanban');
  });

  it('rejects unsupported SOURCE_TYPE at parse time', () => {
    expect(() =>
      parseAppEnv({
        DATABASE_URL: 'file:./tmp-parse-app-env-test.db',
        SOURCE_TYPE: 'gitlab',
      }),
    ).toThrow(ZodError);
  });

  it('rejects unsupported DESTINATION_TYPE at parse time', () => {
    expect(() =>
      parseAppEnv({
        DATABASE_URL: 'file:./tmp-parse-app-env-test.db',
        DESTINATION_TYPE: 'jira',
      }),
    ).toThrow(ZodError);
  });
});
