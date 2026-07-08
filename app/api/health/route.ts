import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    gemini: Boolean(process.env.GEMINI_API_KEY),
    youtube: Boolean(process.env.YOUTUBE_API_KEY),
    vk: Boolean(process.env.VK_SERVICE_TOKEN)
  });
}
