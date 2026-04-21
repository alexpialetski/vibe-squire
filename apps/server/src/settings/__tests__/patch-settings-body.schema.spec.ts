import { CoreSettingsGroup } from '../core-settings-group.service';
import { GithubSettingsGroup } from '../../integrations/github/github-settings-group.service';
import { VkSettingsGroup } from '../../integrations/vibe-kanban/vk-settings-group.service';

describe('partition patchSchema (core)', () => {
  const group = new CoreSettingsGroup();
  const schema = group.patchSchema;

  it('accepts empty object', () => {
    expect(schema.safeParse({}).success).toBe(true);
  });

  it('rejects unknown key for core group', () => {
    const r = schema.safeParse({ not_a_key: 'x' });
    expect(r.success).toBe(false);
  });

  it('rejects non-string value', () => {
    const r = schema.safeParse({
      poll_interval_minutes: 5,
    } as Record<string, unknown>);
    expect(r.success).toBe(false);
  });

  it('rejects invalid max_board_pr_count', () => {
    expect(schema.safeParse({ max_board_pr_count: '0' }).success).toBe(false);
    expect(schema.safeParse({ max_board_pr_count: '201' }).success).toBe(false);
  });

  it('accepts valid max_board_pr_count', () => {
    expect(schema.safeParse({ max_board_pr_count: '5' }).success).toBe(true);
  });

  it('rejects invalid scheduled_sync_enabled', () => {
    expect(schema.safeParse({ scheduled_sync_enabled: 'maybe' }).success).toBe(
      false,
    );
  });

  it('accepts scheduled_sync_enabled spellings', () => {
    for (const v of ['true', 'false', '1', '0', 'yes', 'no', 'TRUE']) {
      expect(schema.safeParse({ scheduled_sync_enabled: v }).success).toBe(
        true,
      );
    }
  });
});

describe('partition patchSchema (source / github)', () => {
  const schema = new GithubSettingsGroup().patchSchema;

  it('accepts github_host update', () => {
    const r = schema.safeParse({
      github_host: 'github.ol.epicgames.net',
    });
    expect(r.success).toBe(true);
  });

  it('rejects invalid pr_ignore_author_logins', () => {
    const r = schema.safeParse({
      pr_ignore_author_logins: 'x'.repeat(9000),
    });
    expect(r.success).toBe(false);
  });

  it('rejects invalid github_host', () => {
    const r = schema.safeParse({
      github_host: 'https://github.com',
    });
    expect(r.success).toBe(false);
  });
});

describe('partition patchSchema (destination / vk)', () => {
  const schema = new VkSettingsGroup().patchSchema;

  it('rejects unknown key for destination group', () => {
    const r = schema.safeParse({ poll_interval_minutes: '5' });
    expect(r.success).toBe(false);
  });
});
