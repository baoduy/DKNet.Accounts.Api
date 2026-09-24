/** `GET /healthz` — liveness only, anonymous, no secret in the body (DRK-1669 §3a). */
export async function GET(): Promise<Response> {
  return Response.json({ status: 'ok' });
}
