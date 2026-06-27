import { NextResponse } from "next/server";
import { rejectDecision } from "@/lib/data/actions";

export async function POST() {
  const result = await rejectDecision();
  return NextResponse.json(result);
}
