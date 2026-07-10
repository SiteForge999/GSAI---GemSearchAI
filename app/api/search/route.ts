import { NextRequest, NextResponse } from "next/server";
import { buildSearchPlan, rankResults } from "@/lib/gemini";
import { searchYouTube } from "@/lib/youtube";
import { SearchResponseBody, VideoResult } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { query?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const query = (body.query || "").trim();

  if (!query) {
    return NextResponse.json({ error: "Пустой запрос" }, { status: 400 });
  }

  const warnings: string[] = [];

  // Шаг 1: Gemini превращает запрос в оптимизированный план поиска для YouTube
  let plan;
  try {
    plan = await buildSearchPlan(query);
  } catch (err: any) {
    warnings.push(`Не удалось построить план через Gemini: ${err.message}`);
    plan = { intent: query, query, order: "relevance" as const };
  }

  // Шаг 2: запрос к YouTube Data API
  let results: VideoResult[] = [];
  try {
    results = await searchYouTube(plan);
  } catch (err: any) {
    warnings.push(`youtube: ${err.message}`);
  }

  // Шаг 3: Gemini ранжирует результаты и объясняет релевантность
  try {
    results = await rankResults(query, plan.intent, results);
  } catch (err: any) {
    warnings.push(`Не удалось ранжировать результаты через Gemini: ${err.message}`);
  }

  const response: SearchResponseBody = { plan, results, warnings };
  return NextResponse.json(response);
}
