import { NextRequest, NextResponse } from "next/server";
import { checkInternalDebugAuth } from "@/lib/auth/internal-debug";
import { generateCarouselFromCandidate } from "@/lib/decision/carousel-from-candidate";

export async function POST(req: NextRequest) {
  const auth = checkInternalDebugAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  let body: { candidate?: Record<string, unknown> };
  try {
    body = await req.json() as { candidate?: Record<string, unknown> };
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.candidate || typeof body.candidate !== "object") {
    return NextResponse.json(
      { ok: false, message: "Missing or invalid candidate in request body" },
      { status: 400 }
    );
  }

  const result = await generateCarouselFromCandidate({ candidate: body.candidate });

  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    source: result.source ?? "openai",
    carousel: result.carousel,
    writes: false,
    instagram_connected: false,
    ...(auth.devBypass && { environment: "development" }),
  });
}
