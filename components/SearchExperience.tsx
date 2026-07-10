"use client";

import { useState } from "react";
import type { VideoResult } from "@/lib/types";
import { formatDate, formatDuration, formatViews } from "@/lib/format";

export default function SearchExperience() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<VideoResult[]>([]);
  const [intent, setIntent] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const runSearch = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setHasSearched(true);
    setWarnings([]);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
      });
      const data = await res.json();
      if (!res.ok) {
        setWarnings([data.error || "Не удалось выполнить поиск"]);
        setResults([]);
        setIntent(null);
      } else {
        setResults(data.results || []);
        setIntent(data.plan?.intent || null);
        setWarnings(data.warnings || []);
      }
    } catch (err: any) {
      setWarnings([`Сетевая ошибка: ${err.message}`]);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-6 py-14 md:px-12 lg:px-24">
      <header className="mx-auto max-w-2xl text-center">
        <p className="font-mono text-xs tracking-[0.3em] text-signal uppercase">
          Умный поиск по YouTube
        </p>
        <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-paper md:text-5xl">
          Найди то, что имел в виду
        </h1>
        <p className="mt-4 text-mute">
          Опишите, что хотите найти, обычными словами — Gemini подберёт точную
          формулировку для YouTube и отранжирует результаты по смыслу запроса,
          а не только по совпадению слов.
        </p>
      </header>

      <div className="mx-auto mt-10 max-w-2xl">
        <div className="rounded-2xl border border-line bg-panel p-2 shadow-2xl shadow-black/40">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="например: разбор тактики последнего матча Реал Мадрид"
              className="flex-1 rounded-xl bg-transparent px-4 py-3 font-mono text-sm text-paper placeholder:text-mute focus:outline-none"
            />
            <button
              onClick={runSearch}
              disabled={loading || !query.trim()}
              className="shrink-0 rounded-xl bg-signal px-6 py-3 font-display text-sm font-bold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Ищу…" : "Искать"}
            </button>
          </div>
        </div>

        {loading && (
          <div className="mx-auto mt-10 flex max-w-sm flex-col gap-2">
            <div className="h-1 w-full rounded-full bg-line">
              <div
                className="stream-bar h-1 rounded-full bg-signal"
              />
            </div>
            <p className="mt-3 text-center font-mono text-xs text-mute">
              разбираю запрос и ищу на YouTube…
            </p>
          </div>
        )}

        {!loading && intent && (
          <p className="mt-6 text-center text-sm text-mute">
            Понял запрос как: <span className="text-paper">«{intent}»</span>
          </p>
        )}

        {!loading && warnings.length > 0 && (
          <div className="mx-auto mt-4 max-w-xl rounded-xl border border-youtube/30 bg-youtube/10 p-3 text-xs text-paper">
            {warnings.map((w, i) => (
              <p key={i}>{w}</p>
            ))}
          </div>
        )}
      </div>

      <div className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 pb-20">
        {results.map((r) => (
          <ResultRow key={r.id} result={r} />
        ))}

        {!loading && hasSearched && results.length === 0 && warnings.length === 0 && (
          <p className="mt-10 text-center text-mute">
            Ничего не нашлось. Попробуйте переформулировать запрос.
          </p>
        )}
      </div>
    </div>
  );
}

function ResultRow({ result }: { result: VideoResult }) {
  return (
    <a
      href={result.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-4 overflow-hidden rounded-xl border border-line bg-panel p-3 transition hover:border-signal/50"
    >
      <span className="w-1 shrink-0 rounded-full bg-youtube" />
      <div className="h-24 w-40 shrink-0 overflow-hidden rounded-lg bg-ink">
        {result.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={result.thumbnail}
            alt=""
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-mute">
            нет превью
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        {result.reason && (
          <span className="w-fit truncate rounded-full bg-signal/10 px-2 py-0.5 text-[10px] text-signal">
            {result.reason}
          </span>
        )}
        <h3 className="truncate font-display text-sm font-medium text-paper">{result.title}</h3>
        <p className="line-clamp-1 text-xs text-mute">{result.description}</p>
        <p className="font-mono text-[11px] text-mute">
          {result.channel ? `${result.channel} · ` : ""}
          {formatDuration(result.durationSeconds)} · {formatViews(result.views)} ·{" "}
          {formatDate(result.publishedAt)}
        </p>
      </div>
    </a>
  );
}
