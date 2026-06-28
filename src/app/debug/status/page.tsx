"use client";

import { useState } from "react";

type PublishJob = { status: string; force_publish: boolean };
type DailyDecision = {
  selected_topic: string;
  status: string;
  main_judgment_preview: string | null;
  risk: string | null;
};
type StatusResult = {
  ok: boolean;
  source: string;
  environment?: string;
  daily_decision: DailyDecision | null;
  publish_job: PublishJob | null;
  carousel_slides_count: number | null;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-4 items-start py-3 border-b border-white/[0.05] last:border-0">
      <span className="w-44 shrink-0 text-xs text-zinc-600 pt-0.5">{label}</span>
      <span className="text-sm text-zinc-200 leading-relaxed">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    scheduled: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    published: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    rejected: "bg-red-500/10 text-red-400 border-red-500/20",
    pending: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  };
  const cls = colors[status] ?? "bg-white/[0.04] text-zinc-400 border-white/[0.08]";
  return (
    <span className={`inline-block text-xs font-mono px-2 py-0.5 rounded border ${cls}`}>
      {status}
    </span>
  );
}

export default function DebugStatusPage() {
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StatusResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCheck() {
    if (!secret.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/debug/write-status", {
        headers: { "x-internal-debug-secret": secret },
      });

      if (res.status === 401) {
        setError("Unauthorized. Please check your Internal Debug Secret.");
        return;
      }

      const data: StatusResult = await res.json();
      setResult(data);
    } catch {
      setError("Request failed. Is the server running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0C0A08] text-white">
      <div className="max-w-xl mx-auto px-6 py-16">

        <div className="mb-12">
          <p className="text-xs font-semibold tracking-widest text-orange-500 uppercase mb-3">
            Internal Tool
          </p>
          <h1 className="text-2xl font-semibold text-white mb-3">
            Debug Status
          </h1>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Check today&apos;s decision and publish job status from Supabase.
          </p>
        </div>

        <div className="space-y-3">
          <label className="block text-xs text-zinc-500 tracking-wide">
            Internal Debug Secret
          </label>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCheck()}
            placeholder="Enter INTERNAL_DEBUG_SECRET"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 transition-colors"
          />
          <button
            onClick={handleCheck}
            disabled={loading || !secret.trim()}
            className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg px-4 py-3 transition-colors"
          >
            {loading ? "Checking…" : "Check Status"}
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-10">
            {result.environment === "development" && (
              <div className="mb-6 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-xs text-amber-400">
                Development mode — secret not validated.
              </div>
            )}

            <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] px-5 divide-y divide-white/[0.05]">
              <Row
                label="Source"
                value={<span className="font-mono text-zinc-400">{result.source}</span>}
              />

              {result.daily_decision ? (
                <>
                  <Row label="Selected Topic" value={result.daily_decision.selected_topic} />
                  <Row
                    label="Decision Status"
                    value={<StatusBadge status={result.daily_decision.status} />}
                  />
                  <Row
                    label="Main Judgment"
                    value={
                      result.daily_decision.main_judgment_preview ? (
                        <span className="text-zinc-400 leading-relaxed">
                          {result.daily_decision.main_judgment_preview}
                          {result.daily_decision.main_judgment_preview.length >= 80 && "…"}
                        </span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )
                    }
                  />
                  <Row
                    label="Risk"
                    value={
                      result.daily_decision.risk ? (
                        <span className="text-zinc-400">{result.daily_decision.risk}</span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )
                    }
                  />
                </>
              ) : (
                <Row label="Today's Decision" value={<span className="text-zinc-600">None found</span>} />
              )}

              {result.publish_job ? (
                <>
                  <Row
                    label="Publish Job Status"
                    value={<StatusBadge status={result.publish_job.status} />}
                  />
                  <Row
                    label="Force Publish"
                    value={
                      <span className={result.publish_job.force_publish ? "text-red-400" : "text-zinc-500"}>
                        {String(result.publish_job.force_publish)}
                      </span>
                    }
                  />
                </>
              ) : (
                <Row label="Publish Job" value={<span className="text-zinc-600">None found</span>} />
              )}

              <Row
                label="Carousel Slides"
                value={
                  result.carousel_slides_count !== null ? (
                    <span className="font-mono text-zinc-300">{result.carousel_slides_count}</span>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )
                }
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
