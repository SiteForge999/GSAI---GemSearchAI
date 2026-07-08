import { PlatformPlan, VideoResult } from "./types";

/**
 * Rutube не публикует официальный документированный API для поиска.
 * Используется общеизвестный публичный JSON-эндпоинт сайта.
 * Ключ не требуется, но эндпоинт может измениться без предупреждения —
 * если поиск перестанет работать, вероятнее всего поменялась именно эта функция.
 */
export async function searchRutube(plan: PlatformPlan, limit = 12): Promise<VideoResult[]> {
  const params = new URLSearchParams({
    query: plan.query,
    format: "json"
  });

  if (plan.order === "date" || plan.recentOnly) {
    params.set("sort", "-publication_ts");
  }

  const res = await fetch(`https://rutube.ru/api/search/video/?${params}`, {
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; SmartVideoSearch/1.0)"
    }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Rutube API: HTTP ${res.status} ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const items: any[] = data.results || [];

  return items.slice(0, limit).map((item) => {
    const id = item.id || item.video_id || String(item.pk || "");
    const url =
      item.video_url ||
      (id ? `https://rutube.ru/video/${id}/` : "https://rutube.ru/");

    return {
      id: String(id),
      platform: "rutube" as const,
      title: item.title || "",
      description: item.description || "",
      thumbnail: item.thumbnail_url || null,
      url,
      channel: item.author?.name || null,
      publishedAt: item.publication_ts
        ? new Date(item.publication_ts * 1000).toISOString()
        : null,
      durationSeconds: item.duration ?? null,
      views: item.hits ?? null
    };
  });
}
