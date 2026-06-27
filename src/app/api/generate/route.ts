import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    ok: true,
    mode: "mock",
    message: "Phoenix V1 prototype uses mock data only.",
  });
}
