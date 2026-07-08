import { Platform, SearchPlan, VideoResult } from "./types";

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

async function callGemini(body: unknown): Promise<any> {
  const res = await fetch(`${GEMINI_ENDPOINT(GEMINI_MODEL)}?key=${getApiKey()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    // У Gemini бывают долгие ответы на сложных запросах
    cache: "no-store"
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini API вернул ошибку ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini API вернул пустой ответ.");
  }

  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  return JSON.parse(cleaned);
}

/**
 * Превращает запрос пользователя на естественном языке в оптимизированные
 * поисковые параметры для каждой из трёх площадок.
 */
export async function buildSearchPlan(
  query: string,
  platforms: Platform[]
): Promise<SearchPlan> {
  const responseSchema = {
    type: "object",
    properties: {
      intent: { type: "string", description: "Краткое описание того, что именно ищет пользователь и зачем" },
      youtube: {
        type: "object",
        properties: {
          query: { type: "string" },
          order: { type: "string", enum: ["relevance", "date", "viewCount"] },
          recentOnly: { type: "boolean" }
        },
        required: ["query"]
      },
      vk: {
        type: "object",
        properties: {
          query: { type: "string" },
          order: { type: "string", enum: ["relevance", "date", "viewCount"] },
          recentOnly: { type: "boolean" }
        },
        required: ["query"]
      },
      rutube: {
        type: "object",
        properties: {
          query: { type: "string" },
          order: { type: "string", enum: ["relevance", "date", "viewCount"] },
          recentOnly: { type: "boolean" }
        },
        required: ["query"]
      }
    },
    required: ["intent", "youtube", "vk", "rutube"]
  };

  const prompt = `Ты — помощник умного видеопоиска. Пользователь ввёл запрос на естественном языке (может быть по-русски или на другом языке).
Твоя задача — разложить этот запрос в оптимальные поисковые ключевые слова отдельно для трёх площадок: YouTube, VK Видео и Rutube.

Правила:
- Для VK Видео и Rutube (русскоязычная аудитория) формулируй ключевые слова по-русски, даже если исходный запрос на другом языке.
- Для YouTube можно оставить международную формулировку, если так запрос точнее (например, оригинальные англоязычные термины).
- Если пользователь явно просит "свежее", "новое", "за последнюю неделю" и т.п. — recentOnly=true и order="date".
- Если явно просит "популярное", "самое просматриваемое" — order="viewCount".
- По умолчанию order="relevance".
- Убери из ключевых слов слова-паразиты запроса ("найди", "покажи", "видео про") и оставь только суть.
- Список активных площадок, которые интересуют пользователя: ${platforms.join(", ")}. Для остальных всё равно верни разумный план (на случай если он передумает), но не как приоритет.

Запрос пользователя: "${query}"

Ответь строго в формате JSON согласно схеме, без пояснений и без markdown-разметки.`;

  const plan = await callGemini({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.3
    }
  });

  return plan as SearchPlan;
}

/**
 * Второй проход: ранжирует объединённые результаты трёх площадок по смыслу
 * запроса и добавляет короткое объяснение "почему это подходит".
 */
export async function rankResults(
  originalQuery: string,
  intent: string,
  results: VideoResult[]
): Promise<VideoResult[]> {
  if (results.length === 0) return results;

  // Отправляем в модель только компактные метаданные, не весь объект
  const compact = results.map((r, i) => ({
    index: i,
    platform: r.platform,
    title: r.title,
    description: r.description?.slice(0, 220) || "",
    channel: r.channel,
    durationSeconds: r.durationSeconds,
    views: r.views,
    publishedAt: r.publishedAt
  }));

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
            reason: { type: "string", description: "Одна короткая фраза по-русски, почему видео подходит запросу" }
          },
          required: ["index", "relevance", "reason"]
        }
      }
    },
    required: ["ranking"]
  };

  const prompt = `Исходный запрос пользователя: "${originalQuery}"
Распознанное намерение: "${intent}"

Ниже список найденных видео с трёх площадок (YouTube, VK, Rutube) в формате JSON.
Оцени каждое видео по релевантности запросу пользователя (от 0 до 1) и дай короткое объяснение (до 8 слов, по-русски), почему оно подходит или чем полезно.
Учитывай не только совпадение слов, но и реальный смысл запроса.

Видео:
${JSON.stringify(compact)}

Ответь строго в формате JSON согласно схеме, без пояснений.`;

  try {
    const parsed = await callGemini({
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
    // Если ранжирование не удалось — возвращаем как есть, без объяснений
    return results;
  }
}
