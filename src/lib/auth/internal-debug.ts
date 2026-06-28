import type { NextRequest } from "next/server";

export type InternalDebugAuthResult =
  | { ok: true; devBypass: boolean }
  | { ok: false };

export function checkInternalDebugAuth(req: NextRequest): InternalDebugAuthResult {
  const expected = process.env.INTERNAL_DEBUG_SECRET;
  const header = req.headers.get("x-internal-debug-secret");

  if (expected && header === expected) {
    return { ok: true, devBypass: false };
  }

  // In non-production, allow bypass (response will be tagged "environment": "development")
  if (process.env.NODE_ENV !== "production") {
    return { ok: true, devBypass: true };
  }

  return { ok: false };
}
