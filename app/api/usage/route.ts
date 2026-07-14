import { NextResponse } from "next/server";
import { getTokenUsage } from "@/lib/tokenUsage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const usage = await getTokenUsage();
  return NextResponse.json(usage);
}
