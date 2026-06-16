import type { Response } from 'express';

/** Initialize an SSE response stream. */
export function openSSE(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
}

/** Send one SSE data frame (JSON-encoded). */
export function sendSSE(res: Response, payload: unknown): void {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

/** Send a heartbeat comment to keep the connection alive. */
export function heartbeat(res: Response): void {
  res.write(`: ping\n\n`);
}
