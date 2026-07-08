"use client";

import { useMemo, useState } from "react";
import type { Platform, VideoResult } from "@/lib/types";
import { formatDate, formatDuration, formatViews, PLATFORM_COLOR, PLATFORM_LABEL } from "@/lib/format";

const ALL_PLATFORMS: Platform[] = ["youtube", "vk", "rutube"];

export default function SearchExperience() {
  const [query, setQuery] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>(ALL_PLATFORMS);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<VideoResult[]>([]);
  const [intent, setIntent] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeFilter, setActiveFilter] = useState<Platform | "all">("all");

  const togglePlatform = (p: Platform) => {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const runSearch = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setHasSearched(true);
    setWarnings([]);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, platforms })
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

  const visibleResults = useMemo(() => {
    if (activeFilter === "all") return results;
    return results.filter((r) => r.platform === activeFilter);
  }, [results, activeFilter]);

  return (
    <div className="min-h-screen px-6 py-14 md:px-12 lg:px-24">
      <header className="mx-auto max-w-3xl text-center">
        <p className="font-mono text-xs tracking-[0.3em] text-signal uppercase">
          Три источника · один запрос
        </p>
        <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-paper md:text-5xl">
          Умный видеопоиск
        </h1>
        <p className="mt-4 text-mute">
          Опишите, что хотите найти, обычными словами — Gemini сам подберёт точные
          формулировки для YouTube, VK Видео и Rutube и соберёт единую ленту по смыслу,
          а не только по совпадению слов.
        </p>
      </header>

      <div className="mx-auto mt-10 max-w-3xl">
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

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {ALL_PLATFORMS.map((p) => {
            const active = platforms.includes(p);
            return (
              <button
                key={p}
                onClick={() => togglePlatform(p)}
                className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition"
                style={{
                  borderColor: active ? PLATFORM_COLOR[p] : "#232935",
                  color: active ? PLATFORM_COLOR[p] : "#8B93A3",
                  backgroundColor: active ? `${PLATFORM_COLOR[p]}14` : "transparent"
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: PLATFORM_COLOR[p] }}
                />
                {PLATFORM_LABEL[p]}
              </button>
            );
          })}
        </div>

        {loading && (
          <div className="mx-auto mt-10 flex max-w-sm flex-col gap-2">
            {ALL_PLATFORMS.map((p, i) => (
              <div key={p} className="h-1 w-full rounded-full bg-line">
                <div
                  className="stream-bar h-1 rounded-full"
                  style={{
                    backgroundColor: PLATFORM_COLOR[p],
                    animationDelay: `${i * 0.15}s`
                  }}
                />
              </div>
            ))}
            <p className="mt-3 text-center font-mono text-xs text-mute">
              собираю сигналы из трёх источников…
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

        {!loading && results.length > 0 && (
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <FilterChip label="Все" active={activeFilter === "all"} onClick={() => setActiveFilter("all")} />
            {ALL_PLATFORMS.map((p) => (
              <FilterChip
                key={p}
                label={PLATFORM_LABEL[p]}
                color={PLATFORM_COLOR[p]}
                active={activeFilter === p}
                onClick={() => setActiveFilter(p)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-3 pb-20">
        {visibleResults.map((r) => (
          <ResultRow key={`${r.platform}-${r.id}`} result={r} />
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

function FilterChip({
  label,
  color,
  active,
  onClick
}: {
  label: string;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-3 py-1 text-xs font-medium transition"
      style={{
        backgroundColor: active ? (color ? `${color}22` : "#5FE0B722") : "transparent",
        color: active ? (color || "#5FE0B7") : "#8B93A3",
        border: `1px solid ${active ? (color || "#5FE0B7") : "#232935"}`
      }}
    >
      {label}
    </button>
  );
}

function ResultRow({ result }: { result: VideoResult }) {
  const color = PLATFORM_COLOR[result.platform];
  return (
    <a
      href={result.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-4 overflow-hidden rounded-xl border border-line bg-panel p-3 transition hover:border-signal/50"
    >
      <span className="w-1 shrink-0 rounded-full" style={{ backgroundColor: color }} />
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
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color }}>
            {PLATFORM_LABEL[result.platform]}
          </span>
          {result.reason && (
            <span className="truncate rounded-full bg-signal/10 px-2 py-0.5 text-[10px] text-signal">
              {result.reason}
            </span>
          )}
        </div>
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
