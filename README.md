# Умный видеопоиск (YouTube · VK · Rutube)

Один запрос на естественном языке → Gemini раскладывает его в оптимальные
поисковые параметры для YouTube, VK Видео и Rutube → результаты трёх площадок
собираются в единую ленту и ранжируются по смыслу запроса.

## Стек

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Serverless-функции Next.js (`app/api/*`) как логическая часть — работают на Vercel без отдельного бэкенда

## Нужные ключи

| Переменная | Где взять |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio / Google Cloud → Generative Language API |
| `YOUTUBE_API_KEY` | Google Cloud Console → включить **YouTube Data API v3** → API key |
| `VK_SERVICE_TOKEN` | vk.com/apps?act=manage → Standalone-приложение → «Сервисный ключ доступа» |

Rutube отдельного ключа не требует (используется публичный эндпоинт сайта).

## Локальный запуск

```bash
npm install
cp .env.example .env.local   # и вписать свои ключи
npm run dev
```

Откройте http://localhost:3000

Проверить, что ключи подхватились: http://localhost:3000/api/health

## Деплой на Vercel

1. Запушьте этот проект в свой репозиторий на GitHub.
2. На vercel.com → Add New → Project → импортируйте репозиторий.
3. В Settings → Environment Variables добавьте `GEMINI_API_KEY`, `YOUTUBE_API_KEY`,
   `VK_SERVICE_TOKEN` (и при желании `GEMINI_MODEL`, `VK_API_VERSION`).
4. Deploy.

Ключи не должны попадать в GitHub — `.env.local` уже в `.gitignore`.

## Структура

```
app/
  api/search/route.ts   — оркестрация: Gemini-план -> 3 источника -> Gemini-ранжирование
  api/health/route.ts   — проверка, что ключи заданы
  layout.tsx, page.tsx
components/
  SearchExperience.tsx  — интерфейс поиска
lib/
  gemini.ts             — план поиска + ранжирование результатов
  youtube.ts, vk.ts, rutube.ts — клиенты трёх платформ
  types.ts, format.ts
```

## Известные ограничения

- Rutube-эндпоint не документирован официально и может измениться — вся логика
  изолирована в `lib/rutube.ts`.
- VK API периодически меняет права доступа для сервисных токенов; если
  `video.search` вернёт ошибку доступа, проверьте настройки приложения в VK.
