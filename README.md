# Умный видеопоиск (YouTube)

Один запрос на естественном языке → Gemini раскладывает его в точный
поисковый запрос для YouTube Data API → результаты ранжируются и
объясняются по смыслу запроса, а не только по совпадению слов.

## Стек

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Serverless-функции Next.js (`app/api/*`) как логическая часть — работают на Vercel без отдельного бэкенда

## Нужные ключи

| Переменная | Где взять |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio / Google Cloud → Generative Language API |
| `YOUTUBE_API_KEY` | Google Cloud Console → включить **YouTube Data API v3** → API key |

## Локальный запуск

\`\`\`bash
npm install
cp .env.example .env.local   # и вписать свои ключи
npm run dev
\`\`\`

Откройте http://localhost:3000

## Деплой на Vercel

1. Запушьте этот проект в свой репозиторий на GitHub.
2. На vercel.com → Add New → Project → импортируйте репозиторий.
3. В Settings → Environment Variables добавьте `GEMINI_API_KEY` и `YOUTUBE_API_KEY`
   (при желании — `GEMINI_MODEL`).
4. Deploy.

Ключи не должны попадать в GitHub — `.env.local` уже в `.gitignore`.

## Структура

\`\`\`
app/
  api/search/route.ts   — оркестрация: Gemini-план -> YouTube -> Gemini-ранжирование
  layout.tsx, page.tsx
components/
  SearchExperience.tsx  — интерфейс поиска
lib/
  gemini.ts             — план поиска + ранжирование результатов
  youtube.ts            — клиент YouTube Data API v3
  types.ts, format.ts
\`\`\`
