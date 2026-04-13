import { z } from 'zod';

/** Matches VK `crates/utils/src/port_file.rs` `PortInfo` JSON. */
export const vkPortFileJsonSchema = z.looseObject({
  main_port: z.number().int().min(1).max(65535),
  preview_proxy_port: z.number().int().min(1).max(65535).optional(),
});

export type VkPortFileJson = z.infer<typeof vkPortFileJsonSchema>;
