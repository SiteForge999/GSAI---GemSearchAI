import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE_PATH = path.join(DATA_DIR, "gemini-token-usage.json");

interface UsageRecord {
  totalTokens: number;
  promptTokens: number;
  candidatesTokens: number;
  // Начало текущего периода учёта (календарный месяц, UTC)
  periodStart: string;
}

// Резервное хранилище в памяти процесса — используется, если запись на диск
// недоступна (например, на serverless-хостинге с read-only файловой системой).
// Важно: на serverless (Vercel и т.п.) разные вызовы функции могут выполняться
// в разных инстансах, поэтому точный подсчёт токенов гарантирован только на
// обычном Node-сервере с постоянной файловой системой. Для надёжного учёта в
// продакшене на serverless лучше подключить внешнее хранилище (например,
// Vercel KV / Upstash Redis) вместо файла.
let memoryUsage: UsageRecord | null = null;

function currentPeriodStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function emptyRecord(): UsageRecord {
  return { totalTokens: 0, promptTokens: 0, candidatesTokens: 0, periodStart: currentPeriodStart() };
}

async function readRecord(): Promise<UsageRecord> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as UsageRecord;
    if (parsed.periodStart !== currentPeriodStart()) return emptyRecord();
    return parsed;
  } catch {
    if (memoryUsage && memoryUsage.periodStart === currentPeriodStart()) return memoryUsage;
    return emptyRecord();
  }
}

async function writeRecord(record: UsageRecord): Promise<void> {
  memoryUsage = record;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(FILE_PATH, JSON.stringify(record), "utf-8");
  } catch {
    // Файловая система недоступна — остаёмся на резервном хранилище в памяти.
  }
}

export async function addTokenUsage(
  promptTokens: number,
  candidatesTokens: number,
  totalTokens: number
): Promise<void> {
  try {
    const record = await readRecord();
    record.promptTokens += promptTokens || 0;
    record.candidatesTokens += candidatesTokens || 0;
    record.totalTokens += totalTokens || (promptTokens || 0) + (candidatesTokens || 0);
    await writeRecord(record);
  } catch {
    // Учёт токенов не должен ломать основной поиск, если что-то пошло не так
  }
}

export interface TokenUsageSummary {
  used: number;
  budget: number;
  remaining: number;
  periodStart: string;
}

export async function getTokenUsage(): Promise<TokenUsageSummary> {
  const record = await readRecord();
  const budget = parseInt(process.env.GEMINI_TOKEN_BUDGET || "1000000", 10);
  const remaining = Math.max(0, budget - record.totalTokens);
  return {
    used: record.totalTokens,
    budget,
    remaining,
    periodStart: record.periodStart
  };
}
