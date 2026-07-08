import { PlatformPlan, VideoResult } from "./types";

const VK_API_VERSION = process.env.VK_API_VERSION || "5.199";

export async function searchVK(plan: PlatformPlan, limit = 12): Promise<VideoResult[]> {
  const token = process.env.VK_SERVICE_TOKEN;
  if (!token) {
    throw new Error(
      "VK_SERVICE_TOKEN не задан. Создайте Standalone-приложение на vk.com/apps?act=manage и возьмите «Сервисный ключ доступа»."
    );
  }

  // sort: 0 — по дате добавления, 2 — по релевантности (актуально на момент написания,
  // при изменениях в API VK — единственное место, которое нужно поправить)
  const sort = plan.order === "date" ? "0" : "2";

  const params = new URLSearchParams({
    q: plan.query,
    count: String(limit),
    sort,
    access_token: token,
    v: VK_API_VERSION,
    adult: "0"
  });

  if (plan.recentOnly) {
    params.set("sort", "0");
  }

  const res = await fetch(`https://api.vk.com/method/video.search?${params}`, {
    cache: "no-store"
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`VK API: HTTP ${res.status} ${text.slice(0, 300)}`);
  }

  const data = await res.json();

  if (data.error) {
    throw new Error(
      `VK API вернул ошибку ${data.error.error_code}: ${data.error.error_msg}. Проверьте токен и права доступа приложения.`
    );
  }

  const items: any[] = data.response?.items || [];

  return items.map((item) => {
    const images: any[] = item.image || [];
    const bestImage = images.length ? images[images.length - 1] : null;

    return {
      id: `${item.owner_id}_${item.id}`,
      platform: "vk" as const,
      title: item.title || "",
      description: item.description || "",
      thumbnail: bestImage?.url || null,
      url: `https://vk.com/video${item.owner_id}_${item.id}`,
      channel: null,
      publishedAt: item.date ? new Date(item.date * 1000).toISOString() : null,
      durationSeconds: item.duration ?? null,
      views: item.views ?? null
    };
  });
}
