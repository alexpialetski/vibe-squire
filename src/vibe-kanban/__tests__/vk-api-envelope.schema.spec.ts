import { vkApiEnvelopeSchema } from '../rest/vk-api-envelope.schema';

describe('vkApiEnvelopeSchema', () => {
  it('accepts success envelope with message null (Vibe Kanban organizations)', () => {
    const parsed = vkApiEnvelopeSchema.safeParse({
      success: true,
      data: { organizations: [] },
      message: null,
    });
    expect(parsed.success).toBe(true);
  });

  it('accepts omitted message', () => {
    const parsed = vkApiEnvelopeSchema.safeParse({
      success: true,
      data: {},
    });
    expect(parsed.success).toBe(true);
  });
});
