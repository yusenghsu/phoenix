// Motion provider abstraction for Phoenix Final Launch Studio.
// No real video generation happens here yet — this is the interface layer.
// Connect Runway / Kling / Pika via their APIs when ready.
// Do not fake success. No provider configured = no generation.

export interface MotionGenerationInput {
  slide_id: string;
  prompt: string;
  negative_prompt: string;
  duration_seconds: 4 | 5 | 6;
  fps: 24 | 30;
  aspect_ratio: "4:5";
  resolution: "1080x1350";
}

export type MotionGenerationStatus =
  | "queued"
  | "generating"
  | "completed"
  | "failed"
  | "provider_not_configured";

export interface MotionGenerationResult {
  slide_id: string;
  status: MotionGenerationStatus;
  video_url?: string;
  thumbnail_url?: string;
  generated_at?: string;
  provider_id: string;
  error?: string;
}

export interface MotionProvider {
  id: string;
  label: string;
  isConfigured(): boolean;
  generateMotionBackground(input: MotionGenerationInput): Promise<MotionGenerationResult>;
}

// ── None provider ─────────────────────────────────────────────────────────────
// Used when no motion provider is configured.
// Returns provider_not_configured immediately — no fake success.

class NoneProvider implements MotionProvider {
  id = "none";
  label = "Not connected";

  isConfigured(): boolean {
    return false;
  }

  async generateMotionBackground(input: MotionGenerationInput): Promise<MotionGenerationResult> {
    return {
      slide_id: input.slide_id,
      status: "provider_not_configured",
      provider_id: this.id,
      error: "Motion provider not connected. Configure MOTION_PROVIDER env var and connect a provider (Runway, Kling, Pika, or Remotion).",
    };
  }
}

// ── Canva provider (placeholder — not yet callable via API) ───────────────────
// Canva can serve as: template engine, motion layout engine, video element layout, MP4 export.
// But Phoenix cannot directly call Canva AI video generator via API yet.
// This adapter describes the future integration — it does not fake generation.

class CanvaProvider implements MotionProvider {
  id = "canva";
  label = "Canva (planned — not yet integrated)";

  isConfigured(): boolean {
    // Future: check for CANVA_CLIENT_ID, CANVA_CLIENT_SECRET
    return false;
  }

  async generateMotionBackground(input: MotionGenerationInput): Promise<MotionGenerationResult> {
    if (!this.isConfigured()) {
      return {
        slide_id: input.slide_id,
        status: "provider_not_configured",
        provider_id: this.id,
        error: "Canva integration not yet configured. See docs/canva-motion-output-plan.md for the integration roadmap.",
      };
    }
    // Future: Canva OAuth → template autofill → video export job → MP4 download
    return {
      slide_id: input.slide_id,
      status: "failed",
      provider_id: this.id,
      error: "Canva integration not implemented yet.",
    };
  }
}

// ── Remotion provider (planned composer) ──────────────────────────────────────
// Remotion can compose background video + text overlay → final MP4.
// This is the planned final-composition layer.
// Not yet implemented — placeholder interface only.

class RemotionProvider implements MotionProvider {
  id = "remotion";
  label = "Remotion (planned — not yet integrated)";

  isConfigured(): boolean {
    // Future: check for REMOTION_API_KEY or local Remotion setup
    return false;
  }

  async generateMotionBackground(input: MotionGenerationInput): Promise<MotionGenerationResult> {
    if (!this.isConfigured()) {
      return {
        slide_id: input.slide_id,
        status: "provider_not_configured",
        provider_id: this.id,
        error: "Remotion integration not yet configured.",
      };
    }
    return {
      slide_id: input.slide_id,
      status: "failed",
      provider_id: this.id,
      error: "Remotion integration not implemented yet.",
    };
  }
}

// ── Provider registry ─────────────────────────────────────────────────────────

const PROVIDERS: Record<string, MotionProvider> = {
  none: new NoneProvider(),
  canva: new CanvaProvider(),
  remotion: new RemotionProvider(),
};

export function getMotionProvider(providerId?: string): MotionProvider {
  const id = providerId ?? "none";
  return PROVIDERS[id] ?? PROVIDERS.none;
}

export function getConfiguredProvider(): MotionProvider {
  // In the future: read from MOTION_PROVIDER env var on the server
  // For now: always returns none (no provider configured)
  return PROVIDERS.none;
}

// role:
//   "motion"      — generates vertical/portrait background video (4:5 / 9:16)
//   "composition" — template, text overlay, MP4 export (needs external video input)
//   "none"        — placeholder
//
// User test (2026-06): Canva AI video outputs 16:9 only.
// Canva role corrected to "composition" — not a motion background provider.
export const PROVIDER_OPTIONS = [
  { id: "none",     label: "Not connected",                                role: "none",        configured: false },
  { id: "runway",   label: "Runway Gen-3 Alpha (set RUNWAY_API_KEY)",      role: "motion",      configured: false },
  { id: "kling",    label: "Kling (not yet integrated)",                   role: "motion",      configured: false },
  { id: "pika",     label: "Pika (not yet integrated)",                    role: "motion",      configured: false },
  { id: "canva",    label: "Canva — composition / export (not AI video)",  role: "composition", configured: false },
  { id: "remotion", label: "Remotion — composition / export (planned)",    role: "composition", configured: false },
] as const;
