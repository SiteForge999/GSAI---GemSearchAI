export function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatViews(views: number | null): string {
  if (views == null) return "—";
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)} млн просмотров`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)} тыс. просмотров`;
  return `${views} просмотров`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

export const PLATFORM_LABEL: Record<string, string> = {
  youtube: "YouTube",
  vk: "VK Видео",
  rutube: "Rutube"
};

export const PLATFORM_COLOR: Record<string, string> = {
  youtube: "#FF4757",
  vk: "#4C87F0",
  rutube: "#F5A623"
};
