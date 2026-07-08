export type Platform = "youtube" | "vk" | "rutube";

export interface VideoResult {
  id: string;
  platform: Platform;
  title: string;
  description: string;
  thumbnail: string | null;
  url: string;
  channel: string | null;
  publishedAt: string | null;
  durationSeconds: number | null;
  views: number | null;
  // Заполняется вторым проходом Gemini (ранжирование/объяснение)
  relevance?: number;
  reason?: string;
}

export interface PlatformPlan {
  query: string;
  order?: "relevance" | "date" | "viewCount";
  recentOnly?: boolean;
}

export interface SearchPlan {
  intent: string;
  youtube: PlatformPlan;
  vk: PlatformPlan;
  rutube: PlatformPlan;
}

export interface SearchRequestBody {
  query: string;
  platforms: Platform[];
}

export interface SearchResponseBody {
  plan: SearchPlan | null;
  results: VideoResult[];
  warnings: string[];
}
