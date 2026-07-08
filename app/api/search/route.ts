import { NextRequest, NextResponse } from "next/server";
import { buildSearchPlan, rankResults } from "@/lib/gemini";
import { searchYouTube } from "@/lib/youtube";
import { searchVK } from "@/lib/vk";
import { searchRutube } from "@/lib/rutube";
import { Platform, SearchResponseBody, VideoResult } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { query?: string; platforms?: Platform[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const query = (body.query || "").trim();
  const platforms: Platform[] =
    body.platforms && body.platforms.length > 0
      ? body.platforms
      : ["youtube", "vk", "rutube"];

  if (!query) {
    return NextResponse.json({ error: "Пустой запрос" }, { status: 400 });
  }

  const warnings: string[] = [];

  // Шаг 1: Gemini превращает запрос в план поиска по трём площадкам
  let plan;
  try {
    plan = await buildSearchPlan(query, platforms);
  } catch (err: any) {
    // Если Gemini недоступен — работаем с исходным запросом как есть на всех площадках
    warnings.push(`Не удалось построить план через Gemini: ${err.message}`);
    plan = {
      intent: query,
      youtube: { query, order: "relevance" as const },
      vk: { query, order: "relevance" as const },
      rutube: { query, order: "relevance" as const }
    };
  }

  // Шаг 2: параллельные запросы к трём площадкам (только к выбранным)
  const tasks: Promise<VideoResult[]>[] = [];
  const taskPlatforms: Platform[] = [];

  if (platforms.includes("youtube")) {
    tasks.push(searchYouTube(plan.youtube));
    taskPlatforms.push("youtube");
  }
  if (platforms.includes("vk")) {
    tasks.push(searchVK(plan.vk));
    taskPlatforms.push("vk");
  }
  if (platforms.includes("rutube")) {
    tasks.push(searchRutube(plan.rutube));
    taskPlatforms.push("rutube");
  }

  const settled = await Promise.allSettled(tasks);
  let results: VideoResult[] = [];

  settled.forEach((outcome, i) => {
    const platform = taskPlatforms[i];
    if (outcome.status === "fulfilled") {
      results.push(...outcome.value);
    } else {
      warnings.push(`${platform}: ${outcome.reason?.message || "неизвестная ошибка"}`);
    }
  });

  // Шаг 3: Gemini ранжирует объединённый список и объясняет релевантность
  try {
    results = await rankResults(query, plan.intent, results);
  } catch (err: any) {
    warnings.push(`Не удалось ранжировать результаты через Gemini: ${err.message}`);
  }

  const response: SearchResponseBody = { plan, results, warnings };
  return NextResponse.json(response);
}
