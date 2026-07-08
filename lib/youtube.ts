import { PlatformPlan, VideoResult } from "./types";

function parseISODuration(iso: string | undefined): number | null {
  if (!iso) return null;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

export async function searchYouTube(plan: PlatformPlan, limit = 12): Promise<VideoResult[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "YOUTUBE_API_KEY не задан. Включите YouTube Data API v3 в Google Cloud Console и создайте API-ключ."
    );
  }

  const order = plan.order === "date" ? "date" : plan.order === "viewCount" ? "viewCount" : "relevance";

  const searchParams = new URLSearchParams({
    part: "snippet",
    q: plan.query,
    type: "video",
    maxResults: String(limit),
    order,
    key: apiKey
  });

  if (plan.recentOnly) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    searchParams.set("publishedAfter", weekAgo);
  }

  const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?${searchParams}`, {
    cache: "no-store"
  });

  if (!searchRes.ok) {
    const text = await searchRes.text().catch(() => "");
    throw new Error(`YouTube search API: ${searchRes.status} ${text.slice(0, 300)}`);
  }

  const searchData = await searchRes.json();
  const ids: string[] = (searchData.items || [])
    .map((item: any) => item.id?.videoId)
    .filter(Boolean);

  if (ids.length === 0) return [];

  // Второй запрос — за деталями (длительность, просмотры)
  const detailsParams = new URLSearchParams({
    part: "snippet,contentDetails,statistics",
    id: ids.join(","),
    key: apiKey
  });

  const detailsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?${detailsParams}`, {
    cache: "no-store"
  });

  if (!detailsRes.ok) {
    // Если детали не получили — вернём хотя бы базовые данные из поиска
    return (searchData.items || []).map((item: any) => ({
      id: item.id.videoId,
      platform: "youtube" as const,
      title: item.snippet?.title || "",
      description: item.snippet?.description || "",
      thumbnail: item.snippet?.thumbnails?.medium?.url || null,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      channel: item.snippet?.channelTitle || null,
      publishedAt: item.snippet?.publishedAt || null,
      durationSeconds: null,
      views: null
    }));
  }

  const detailsData = await detailsRes.json();

  return (detailsData.items || []).map((item: any) => ({
    id: item.id,
    platform: "youtube" as const,
    title: item.snippet?.title || "",
    description: item.snippet?.description || "",
    thumbnail:
      item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || null,
    url: `https://www.youtube.com/watch?v=${item.id}`,
    channel: item.snippet?.channelTitle || null,
    publishedAt: item.snippet?.publishedAt || null,
    durationSeconds: parseISODuration(item.contentDetails?.duration),
    views: item.statistics?.viewCount ? parseInt(item.statistics.viewCount, 10) : null
  }));
}
