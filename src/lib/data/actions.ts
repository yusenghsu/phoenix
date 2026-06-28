import "server-only";
import { createServerClient } from "../supabase/server";
import { taipeiDate } from "./taipei-date";

type Client = NonNullable<ReturnType<typeof createServerClient>>;

const MOCK_FALLBACK = {
  ok: true as const,
  source: "mock_fallback" as const,
  message: "Supabase write skipped because environment is missing or write failed.",
};

const MOCK_USER_ID = "a0000000-0000-0000-0000-000000000001";

async function getTodayDecisionId(client: Client): Promise<string | null> {
  const today = taipeiDate();
  const { data } = await client
    .from("daily_decisions")
    .select("id")
    .eq("decision_date", today)
    .single();
  return (data as { id: string } | null)?.id ?? null;
}

async function getCarouselDraftId(client: Client, decisionId: string): Promise<string | null> {
  const { data } = await client
    .from("carousel_drafts")
    .select("id")
    .eq("daily_decision_id", decisionId)
    .single();
  return (data as { id: string } | null)?.id ?? null;
}

async function updateDecisionStatus(
  client: Client,
  decisionId: string,
  status: string
): Promise<boolean> {
  const { error } = await client
    .from("daily_decisions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", decisionId);
  return !error;
}

async function upsertPublishJob(
  client: Client,
  decisionId: string,
  carouselDraftId: string,
  forcePublish: boolean
): Promise<boolean> {
  // Store 20:00 Taiwan time (Asia/Taipei = UTC+8, so UTC 12:00)
  const taipeiDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
  const scheduledAt = new Date(`${taipeiDate}T12:00:00.000Z`);
  const now = new Date().toISOString();

  const { data: existing } = await client
    .from("publish_jobs")
    .select("id")
    .eq("daily_decision_id", decisionId)
    .maybeSingle();

  if (existing) {
    const { error } = await client
      .from("publish_jobs")
      .update({
        status: "scheduled",
        scheduled_at: scheduledAt.toISOString(),
        force_publish: forcePublish,
        updated_at: now,
      })
      .eq("id", (existing as { id: string }).id);
    return !error;
  }

  const { error } = await client.from("publish_jobs").insert({
    daily_decision_id: decisionId,
    carousel_draft_id: carouselDraftId,
    user_id: MOCK_USER_ID,
    status: "scheduled",
    scheduled_at: scheduledAt.toISOString(),
    force_publish: forcePublish,
    created_at: now,
    updated_at: now,
  });
  return !error;
}

async function cancelPublishJob(client: Client, decisionId: string): Promise<void> {
  await client
    .from("publish_jobs")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("daily_decision_id", decisionId);
}

async function insertLearningLog(
  client: Client,
  decisionId: string,
  learningType: string,
  summary: string
): Promise<boolean> {
  const { error } = await client.from("learning_logs").insert({
    user_id: MOCK_USER_ID,
    daily_decision_id: decisionId,
    learning_type: learningType,
    summary,
    signal_data: {},
    created_at: new Date().toISOString(),
  });
  return !error;
}

// ─── Exported actions ─────────────────────────────────────────────────────────

export async function approveDecision() {
  const client = createServerClient();
  if (!client) return MOCK_FALLBACK;
  try {
    const decisionId = await getTodayDecisionId(client);
    if (!decisionId) return MOCK_FALLBACK;

    const carouselDraftId = await getCarouselDraftId(client, decisionId);
    if (!carouselDraftId) return MOCK_FALLBACK;

    const [decisionOk, jobOk] = await Promise.all([
      updateDecisionStatus(client, decisionId, "scheduled"),
      upsertPublishJob(client, decisionId, carouselDraftId, false),
    ]);

    if (!decisionOk || !jobOk) return MOCK_FALLBACK;
    return { ok: true as const, action: "approve" as const };
  } catch {
    return MOCK_FALLBACK;
  }
}

export async function rejectDecision() {
  const client = createServerClient();
  if (!client) return MOCK_FALLBACK;
  try {
    const decisionId = await getTodayDecisionId(client);
    if (!decisionId) return MOCK_FALLBACK;

    const [decisionOk, logOk] = await Promise.all([
      updateDecisionStatus(client, decisionId, "rejected"),
      insertLearningLog(
        client,
        decisionId,
        "rejection",
        "小佑拒絕了今天的推薦，Phoenix 將在下一次週期重新分析。"
      ),
      cancelPublishJob(client, decisionId),
    ]);

    if (!decisionOk || !logOk) return MOCK_FALLBACK;
    return { ok: true as const, action: "reject" as const };
  } catch {
    return MOCK_FALLBACK;
  }
}

export async function forcePublishDecision() {
  const client = createServerClient();
  if (!client) return MOCK_FALLBACK;
  try {
    const decisionId = await getTodayDecisionId(client);
    if (!decisionId) return MOCK_FALLBACK;

    const carouselDraftId = await getCarouselDraftId(client, decisionId);
    if (!carouselDraftId) return MOCK_FALLBACK;

    const [decisionOk, jobOk, logOk] = await Promise.all([
      updateDecisionStatus(client, decisionId, "scheduled"),
      upsertPublishJob(client, decisionId, carouselDraftId, true),
      insertLearningLog(
        client,
        decisionId,
        "force_publish",
        "小佑選擇強制發布，Phoenix 將記錄這次人工覆寫決策。"
      ),
    ]);

    if (!decisionOk || !jobOk || !logOk) return MOCK_FALLBACK;
    return { ok: true as const, action: "force_publish" as const };
  } catch {
    return MOCK_FALLBACK;
  }
}
