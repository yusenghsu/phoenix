import { NextRequest, NextResponse } from "next/server";
import { isRunwayConfigured, generateRunwayVideo } from "@/lib/launch/providers/runway-provider";

export const runtime = "nodejs";
// 3-minute ceiling — Runway Gen-3 generation can take 60–120s; polling adds overhead.
// This route is development-only so Vercel timeout limits don't apply.
export const maxDuration = 180;

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { status: "failed", error: "Motion generation is not available in production." },
      { status: 403 }
    );
  }

  // Honest provider check — no fake success
  if (!isRunwayConfigured()) {
    return NextResponse.json({
      status: "failed",
      error:
        "RUNWAY_API_KEY not configured. Add RUNWAY_API_KEY=<your-key> to .env.local, then restart the dev server.",
    });
  }

  let body: {
    slide_id: string;
    video_generation_prompt: string;
    duration_seconds?: number;
    aspect_ratio?: string;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ status: "failed", error: "Invalid JSON body" }, { status: 400 });
  }

  const { slide_id, video_generation_prompt, duration_seconds = 5 } = body;

  if (!slide_id || !video_generation_prompt) {
    return NextResponse.json(
      { status: "failed", error: "slide_id and video_generation_prompt are required" },
      { status: 400 }
    );
  }

  const validDurations: Array<4 | 5 | 6> = [4, 5, 6];
  const safeSeconds: 4 | 5 | 6 = validDurations.includes(duration_seconds as 4 | 5 | 6)
    ? (duration_seconds as 4 | 5 | 6)
    : 5;

  try {
    const { video_url, generated_at } = await generateRunwayVideo({
      slideId: slide_id,
      prompt: video_generation_prompt,
      durationSeconds: safeSeconds,
    });

    return NextResponse.json({
      slide_id,
      status: "video_generated",
      provider: "runway",
      background_video_url: video_url,
      generated_at,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[generate-motion-slide] ${slide_id}:`, msg);
    return NextResponse.json({ slide_id, status: "failed", error: msg }, { status: 500 });
  }
}
