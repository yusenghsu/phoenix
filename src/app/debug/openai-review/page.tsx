"use client";

import { useState } from "react";

type DecisionFactor = { label: string; score: number; text: string };
type Candidate = {
  topic: string;
  marketScore: number;
  brandFitScore: number;
  shareScore: number;
  riskLevel: string;
  rejectedReason: string | null;
  selected: boolean;
};
type Slide = { slideNumber: number; headline: string; body: string };
type DryRunResult = {
  ok: boolean;
  source: string;
  mode: string;
  writes: boolean;
  message?: string;
  decision?: {
    selectedTopic: string;
    confidenceScore: number;
    mainJudgment: string;
    risk: string;
    decisionFactors?: DecisionFactor[];
  };
  candidates?: Candidate[];
  carouselSlides?: Slide[];
  caption?: string;
  hashtags?: string[];
  learningLog?: string;
};

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 90 ? "text-orange-400" : score >= 75 ? "text-amber-400" : "text-zinc-400";
  return <span className={`font-mono font-semibold ${color}`}>{score}</span>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-white/[0.06] pt-8 mt-8">
      <h2 className="text-xs font-semibold tracking-widest text-zinc-500 uppercase mb-5">
        {title}
      </h2>
      {children}
    </div>
  );
}

export default function OpenAIReviewPage() {
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DryRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    if (!secret.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/debug/openai-decision-dry-run", {
        method: "POST",
        headers: { "x-openai-dry-run-secret": secret },
      });

      if (res.status === 401) {
        setError("Unauthorized. Please check your dry run secret.");
        return;
      }

      const data: DryRunResult = await res.json();
      setResult(data);
    } catch {
      setError("Request failed. Is the dev server running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0C0A08] text-white">
      <div className="max-w-2xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-12">
          <p className="text-xs font-semibold tracking-widest text-orange-500 uppercase mb-3">
            Internal Tool
          </p>
          <h1 className="text-2xl font-semibold text-white mb-3">
            OpenAI Decision Review
          </h1>
          <p className="text-sm text-zinc-500 leading-relaxed">
            這個頁面只執行 dry run，不會寫入 Supabase，也不會影響首頁或排程。
          </p>
        </div>

        {/* Input */}
        <div className="space-y-3">
          <label className="block text-xs text-zinc-500 tracking-wide">
            Dry Run Secret
          </label>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRun()}
            placeholder="Enter OPENAI_DRY_RUN_SECRET"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 transition-colors"
          />
          <button
            onClick={handleRun}
            disabled={loading || !secret.trim()}
            className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg px-4 py-3 transition-colors"
          >
            {loading ? "Running…" : "Run OpenAI Dry Run"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="mt-10">

            {/* Mock fallback notice */}
            {result.source === "mock_fallback" && (
              <div className="mb-6 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-400">
                OpenAI unavailable. Showing mock fallback.
              </div>
            )}

            {/* Safety Status */}
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-5 py-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-zinc-500">
              <span>Writes: <span className="text-emerald-500 font-semibold">false</span></span>
              <span>Publishing: <span className="text-emerald-500 font-semibold">disabled</span></span>
              <span>Cron impact: <span className="text-emerald-500 font-semibold">none</span></span>
              <span>Supabase mutation: <span className="text-emerald-500 font-semibold">none</span></span>
              <span>Source: <span className="text-zinc-300 font-semibold">{result.source}</span></span>
            </div>

            {/* Recommendation */}
            {result.decision && (
              <Section title="Recommendation">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-zinc-600 mb-1">Selected Topic</p>
                    <p className="text-lg font-semibold text-white">
                      {result.decision.selectedTopic}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-600 mb-1">Confidence Score</p>
                    <p className="text-3xl font-bold text-orange-400">
                      {result.decision.confidenceScore}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-600 mb-1">Main Judgment</p>
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      {result.decision.mainJudgment}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-600 mb-1">Risk</p>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      {result.decision.risk}
                    </p>
                  </div>
                </div>
              </Section>
            )}

            {/* Decision Factors */}
            {result.decision?.decisionFactors && result.decision.decisionFactors.length > 0 && (
              <Section title="Decision Factors">
                <div className="space-y-3">
                  {result.decision.decisionFactors.map((f, i) => (
                    <div
                      key={i}
                      className="flex gap-4 items-start rounded-lg bg-white/[0.02] border border-white/[0.05] px-4 py-3"
                    >
                      <div className="w-16 shrink-0 text-center">
                        <ScoreBadge score={f.score} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-zinc-300 mb-0.5">{f.label}</p>
                        <p className="text-xs text-zinc-500 leading-relaxed">{f.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Candidates */}
            {result.candidates && result.candidates.length > 0 && (
              <Section title="Candidates">
                <div className="space-y-3">
                  {result.candidates.map((c, i) => (
                    <div
                      key={i}
                      className={`rounded-lg border px-4 py-3 ${
                        c.selected
                          ? "bg-orange-500/10 border-orange-500/30"
                          : "bg-white/[0.02] border-white/[0.05]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className={`text-sm font-semibold ${c.selected ? "text-orange-300" : "text-zinc-300"}`}>
                          {c.topic}
                          {c.selected && (
                            <span className="ml-2 text-xs font-normal bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                              Selected
                            </span>
                          )}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          c.riskLevel === "low" ? "bg-emerald-500/15 text-emerald-400" :
                          c.riskLevel === "medium" ? "bg-amber-500/15 text-amber-400" :
                          "bg-red-500/15 text-red-400"
                        }`}>
                          {c.riskLevel}
                        </span>
                      </div>
                      <div className="flex gap-4 text-xs text-zinc-500">
                        <span>Market <ScoreBadge score={c.marketScore} /></span>
                        <span>DNA Fit <ScoreBadge score={c.brandFitScore} /></span>
                        <span>Share <ScoreBadge score={c.shareScore} /></span>
                      </div>
                      {c.rejectedReason && (
                        <p className="mt-2 text-xs text-zinc-600 italic">{c.rejectedReason}</p>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Carousel Draft */}
            {result.carouselSlides && result.carouselSlides.length > 0 && (
              <Section title="Carousel Draft">
                <div className="space-y-2">
                  {result.carouselSlides.map((s) => (
                    <div
                      key={s.slideNumber}
                      className="rounded-lg bg-white/[0.02] border border-white/[0.05] px-4 py-3"
                    >
                      <p className="text-xs text-zinc-600 mb-1">Slide {s.slideNumber}</p>
                      <p className="text-sm font-semibold text-zinc-200">{s.headline}</p>
                      {s.body && (
                        <p className="text-xs text-zinc-500 mt-1">{s.body}</p>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Caption */}
            {result.caption && (
              <Section title="Caption">
                <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-line">
                  {result.caption}
                </p>
              </Section>
            )}

            {/* Hashtags */}
            {result.hashtags && result.hashtags.length > 0 && (
              <Section title="Hashtags">
                <div className="flex flex-wrap gap-2">
                  {result.hashtags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-xs bg-white/[0.04] border border-white/[0.08] rounded-full px-3 py-1 text-zinc-400"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {/* Learning Log */}
            {result.learningLog && (
              <Section title="Learning Log">
                <p className="text-sm text-zinc-500 leading-relaxed">{result.learningLog}</p>
              </Section>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
