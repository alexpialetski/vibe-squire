import { vkPortFileJsonSchema } from '../vk-port-file.schema';

describe('vkPortFileJsonSchema', () => {
  it('parses main_port with optional preview_proxy_port', () => {
    const r = vkPortFileJsonSchema.safeParse({
      main_port: 43447,
      preview_proxy_port: 42765,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.main_port).toBe(43447);
      expect(r.data.preview_proxy_port).toBe(42765);
    }
  });

  it('rejects invalid port range', () => {
    const r = vkPortFileJsonSchema.safeParse({ main_port: 70000 });
    expect(r.success).toBe(false);
  });
});
