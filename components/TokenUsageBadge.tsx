"use client";

import { useEffect, useState } from "react";
import type { TokenUsageSummary } from "@/lib/tokenUsage";

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} млн`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)} тыс.`;
  return `${n}`;
}

export default function TokenUsageBadge() {
  const [usage, setUsage] = useState<TokenUsageSummary | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const res = await fetch("/api/usage", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as TokenUsageSummary;
        if (active) setUsage(data);
      } catch {
        // молча пропускаем — просто не покажем бейдж в этот раз
      }
    };

    load();
    const interval = setInterval(load, 30_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (!usage) return null;

  const pct = usage.budget > 0 ? Math.min(100, Math.round((usage.used / usage.budget) * 100)) : 0;

  return (
    <div className="fixed bottom-4 left-4 z-40 rounded-full border border-line bg-panel px-3 py-1.5 font-mono text-[11px] text-mute shadow-lg">
      Gemini: осталось {formatCompact(usage.remaining)} токенов ({pct}% использовано в этом месяце)
    </div>
  );
}
