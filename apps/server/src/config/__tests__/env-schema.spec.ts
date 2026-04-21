import { ZodError } from 'zod';
import { parseAppEnv } from '../env-schema';

const testDbUrl = 'file:./tmp-parse-app-env-test.db';

describe('parseAppEnv', () => {
  it('defaults VIBE_SQUIRE_SOURCE_TYPE and VIBE_SQUIRE_DESTINATION_TYPE when unset', () => {
    const env = parseAppEnv({
      VIBE_SQUIRE_DATABASE_URL: testDbUrl,
    });
    expect(env.sourceType).toBe('github');
    expect(env.destinationType).toBe('vibe_kanban');
  });

  it('rejects unsupported VIBE_SQUIRE_SOURCE_TYPE at parse time', () => {
    expect(() =>
      parseAppEnv({
        VIBE_SQUIRE_DATABASE_URL: testDbUrl,
        VIBE_SQUIRE_SOURCE_TYPE: 'gitlab',
      }),
    ).toThrow(ZodError);
  });

  it('rejects unsupported VIBE_SQUIRE_DESTINATION_TYPE at parse time', () => {
    expect(() =>
      parseAppEnv({
        VIBE_SQUIRE_DATABASE_URL: testDbUrl,
        VIBE_SQUIRE_DESTINATION_TYPE: 'jira',
      }),
    ).toThrow(ZodError);
  });

  it('reads VIBE_SQUIRE_PORT', () => {
    const env = parseAppEnv({
      VIBE_SQUIRE_DATABASE_URL: testDbUrl,
      VIBE_SQUIRE_PORT: '4000',
    });
    expect(env.port).toBe(4000);
  });
});
