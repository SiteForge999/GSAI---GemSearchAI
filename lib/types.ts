export interface VideoResult {
  id: string;
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

export interface SearchPlan {
  intent: string;
  query: string;
  order?: "relevance" | "date" | "viewCount";
  recentOnly?: boolean;
}

export interface SearchRequestBody {
  query: string;
}

export interface SearchResponseBody {
  plan: SearchPlan | null;
  results: VideoResult[];
  warnings: string[];
}
