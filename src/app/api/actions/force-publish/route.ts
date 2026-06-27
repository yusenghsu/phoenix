import { NextResponse } from "next/server";
import { forcePublishDecision } from "@/lib/data/actions";

export async function POST() {
  const result = await forcePublishDecision();
  return NextResponse.json(result);
}
