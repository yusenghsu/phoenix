// Shared helpers for Phoenix daily cron routes.
// Server-side only — never import in client components.
import "server-only";
import type { NextRequest } from "next/server";
import { logJobEvent } from "./service";

export interface CronAuthResult {
  ok: boolean;
  devMode: boolean;
  reason?: string;
}

// Verifies CRON_SECRET from Authorization header or ?secret= query param.
// In development with no CRON_SECRET set, allows through with devMode: true.
export function verifyCronRequest(req: NextRequest): CronAuthResult {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "development") {
      return { ok: true, devMode: true };
    }
    return { ok: false, devMode: false, reason: "CRON_SECRET not configured" };
  }

  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return { ok: true, devMode: false };

  const xCron = req.headers.get("x-cron-secret");
  if (xCron === secret) return { ok: true, devMode: false };

  const url = new URL(req.url);
  if (url.searchParams.get("secret") === secret) return { ok: true, devMode: false };

  return { ok: false, devMode: false, reason: "Invalid credentials" };
}

// Returns today's run date in Taiwan time (YYYY-MM-DD).
export function getTaiwanRunDate(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Taipei" });
}

export interface LogCronInput {
  runId?: string;
  jobType: string;
  status: string;
  message: string;
  payload?: Record<string, unknown>;
}

export async function logCronTriggered(input: LogCronInput): Promise<void> {
  try {
    await logJobEvent({
      run_id: input.runId,
      job_type: input.jobType,
      status: input.status,
      message: input.message,
      payload: input.payload ?? {},
    });
  } catch {
    // Non-critical — don't let event logging failures break cron execution
  }
}

export interface CronResponseInput {
  jobType: string;
  status: string;
  runDate: string;
  runId?: string;
  devMode: boolean;
  message: string;
  detail?: Record<string, unknown>;
}

export function buildCronResponse(input: CronResponseInput): Record<string, unknown> {
  return {
    ok: true,
    job_type: input.jobType,
    status: input.status,
    run_date: input.runDate,
    run_id: input.runId ?? null,
    dev_mode: input.devMode,
    message: input.message,
    ...input.detail,
  };
}
