import fs from 'node:fs';
import path from 'node:path';
import type { Tool } from './index.js';
import { SEED_DIR } from '../../config/env.js';
import { track } from '../../analytics/track.js';

type Order = Record<string, unknown> & { orderId: string };

let cache: Order[] | null = null;
function loadOrders(): Order[] {
  if (cache) return cache;
  try {
    const raw = fs.readFileSync(path.join(SEED_DIR, 'orders.json'), 'utf8');
    cache = JSON.parse(raw) as Order[];
  } catch {
    cache = [];
  }
  return cache;
}

export const checkOrderStatus: Tool = {
  name: 'check_order_status',
  description:
    'Look up a food delivery order by its order ID (format FA-XXXX) to see the restaurant, items, total, delivery status (preparing / on the way / delivered / cancelled), ETA, courier, and payment status.',
  parameters: {
    orderId: 'string — the order ID, e.g. "FA-1002"',
  },
  async run(args, ctx) {
    const orderId = String(args.orderId ?? '').trim().toUpperCase();
    track('tool_called', { conversationId: ctx.conversationId, meta: { tool: 'check_order_status', orderId } });

    if (!orderId) return { ok: false, observation: 'No orderId provided.' };

    const order = loadOrders().find((o) => o.orderId.toUpperCase() === orderId);
    if (!order) {
      return {
        ok: true,
        observation: `No order found with ID "${orderId}". Ask the customer to confirm their order ID.`,
      };
    }
    return {
      ok: true,
      observation: `Order ${orderId}: ${JSON.stringify(order, null, 2)}`,
      data: order,
    };
  },
};
