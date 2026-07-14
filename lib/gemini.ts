import { SearchPlan, SearchResult } from "./types";
import { addTokenUsage } from "./tokenUsage";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY не задан в переменных окружения. Добавьте его в Vercel → Settings → Environment Variables."
    );
  }
  return key;
}

interface GeminiCallResult {
  result: any;
  usage: { promptTokens: number; candidatesTokens: number; totalTokens: number };
}

async function callGemini(body: unknown): Promise<GeminiCallResult> {
  const res = await fetch(`${GEMINI_ENDPOINT(GEMINI_MODEL)}?key=${getApiKey()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store"
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini API вернул ошибку ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  const usageMeta = data?.usageMetadata || {};
  const usage = {
    promptTokens: usageMeta.promptTokenCount || 0,
    candidatesTokens: usageMeta.candidatesTokenCount || 0,
    totalTokens: usageMeta.totalTokenCount || 0
  };
  // Учитываем токены даже если сам ответ окажется невалидным JSON — списание
  // токенов у Gemini уже произошло на их стороне
  await addTokenUsage(usage.promptTokens, usage.candidatesTokens, usage.totalTokens);

  if (!text) {
    throw new Error("Gemini API вернул пустой ответ.");
  }

  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  return { result: JSON.parse(cleaned), usage };
}

/**
 * Превращает запрос пользователя на естественном языке в оптимизированные
 * поисковые параметры для YouTube Data API.
 */
export async function buildSearchPlan(query: string): Promise<SearchPlan> {
  const responseSchema = {
    type: "object",
    properties: {
      intent: {
        type: "string",
        description: "Краткое описание того, что именно ищет пользователь и зачем"
      },
      query: {
        type: "string",
        description: "Оптимизированный поисковый запрос для YouTube Data API"
      },
      order: { type: "string", enum: ["relevance", "date", "viewCount"] },
      recentOnly: { type: "boolean" }
    },
    required: ["intent", "query"]
  };

  const prompt = `Ты — помощник умного поиска видео на YouTube. Пользователь ввёл запрос на естественном языке.
Твоя задача — превратить его в точный поисковый запрос для YouTube Data API.

Правила:
- Убери из формулировки слова-паразиты ("найди", "покажи", "видео про") и оставь только суть, но сохрани важные детали (имена, термины, названия).
- Если запрос точнее звучит на языке оригинала (например, англоязычный технический термин) — используй его, иначе формулируй так, как пользователь.
- Если пользователь явно просит "свежее", "новое", "за последнюю неделю" и т.п. — recentOnly=true и order="date".
- Если явно просит "популярное", "самое просматриваемое" — order="viewCount".
- По умолчанию order="relevance".

Запрос пользователя: "${query}"

Ответь строго в формате JSON согласно схеме, без пояснений и без markdown-разметки.`;

  const { result } = await callGemini({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.3
    }
  });

  return result as SearchPlan;
}

/**
 * Второй проход: ранжирует найденные результаты (видео, shorts, каналы или
 * плейлисты — любой из них) по смыслу запроса и добавляет короткое
 * объяснение "почему это подходит".
 */
export async function rankResults(
  originalQuery: string,
  intent: string,
  results: SearchResult[]
): Promise<SearchResult[]> {
  if (results.length === 0) return results;

  const compact = results.map((r, i) => {
    const base: Record<string, unknown> = {
      index: i,
      title: r.title,
      description: r.description?.slice(0, 220) || ""
    };

    if (r.kind === "video" || r.kind === "short") {
      base.channel = r.channel;
      base.durationSeconds = r.durationSeconds;
      base.views = r.views;
      base.publishedAt = r.publishedAt;
    } else if (r.kind === "channel") {
      base.subscriberCount = r.subscriberCount;
      base.videoCount = r.videoCount;
    } else if (r.kind === "playlist") {
      base.channel = r.channel;
      base.itemCount = r.itemCount;
    }

    return base;
  });

  const responseSchema = {
    type: "object",
    properties: {
      ranking: {
        type: "array",
        items: {
          type: "object",
          properties: {
            index: { type: "integer" },
            relevance: { type: "number", description: "От 0 до 1" },
            reason: {
              type: "string",
              description: "Одна короткая фраза по-русски, почему результат подходит запросу"
            }
          },
          required: ["index", "relevance", "reason"]
        }
      }
    },
    required: ["ranking"]
  };

  const prompt = `Исходный запрос пользователя: "${originalQuery}"
Распознанное намерение: "${intent}"

Ниже список найденных на YouTube результатов (это могут быть видео, Shorts,
каналы или плейлисты) в формате JSON.
Оцени каждый результат по релевантности запросу пользователя (от 0 до 1) и дай короткое объяснение (до 8 слов, по-русски), почему он подходит или чем полезен.
Учитывай не только совпадение слов, но и реальный смысл запроса.

Результаты:
${JSON.stringify(compact)}

Ответь строго в формате JSON согласно схеме, без пояснений.`;

  try {
    const { result: parsed } = await callGemini({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.2
      }
    });

    const ranking: { index: number; relevance: number; reason: string }[] = parsed.ranking || [];
    const byIndex = new Map(ranking.map((r) => [r.index, r]));

    const merged = results.map((r, i) => {
      const rank = byIndex.get(i);
      return {
        ...r,
        relevance: rank?.relevance ?? 0.5,
        reason: rank?.reason ?? ""
      };
    });

    merged.sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0));
    return merged;
  } catch {
    return results;
  }
}
