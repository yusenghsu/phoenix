import { NextResponse } from "next/server";
import { approveDecision } from "@/lib/data/actions";

export async function POST() {
  const result = await approveDecision();
  return NextResponse.json(result);
}
