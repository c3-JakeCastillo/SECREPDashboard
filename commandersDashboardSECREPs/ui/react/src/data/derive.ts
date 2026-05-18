import type {
  MonthlyClosures,
  RepairJob,
  ServiceRequest,
  TimeRange,
} from "../types";

/** Cost savings on a Code B success = replacement_cost − repair_cost. */
export function costSavings(replacementCost: number, repairCost: number): number {
  return Math.max(0, replacementCost - repairCost);
}

/** Repair rate = Code B successes / (Code B + Code F WIR). 0-1 scale. */
export function repairRate(jobs: RepairJob[]): number {
  const decided = jobs.filter((j) => j.outcome !== null);
  if (decided.length === 0) return 0;
  const successes = decided.filter((j) => j.outcome === "CodeB_Success").length;
  return successes / decided.length;
}

/** Average customer wait time in days, computed from a list of closed service requests. */
export function avgCwtDays(closedRequests: ServiceRequest[]): number {
  if (closedRequests.length === 0) return 0;
  const total = closedRequests.reduce((sum, wo) => {
    if (!wo.close_date) return sum;
    const induct = new Date(wo.induction_date).getTime();
    const close = new Date(wo.close_date).getTime();
    return sum + (close - induct) / (1000 * 60 * 60 * 24);
  }, 0);
  return total / closedRequests.length;
}

/** Trim a months_ago series to a TimeRange selector. */
export function filterMonthlySeries<T extends { months_ago: number }>(
  series: T[],
  range: TimeRange
): T[] {
  switch (range) {
    case "current_month":
      return series.filter((m) => m.months_ago === 0);
    case "last_30_days":
      return series.filter((m) => m.months_ago === 0);
    case "trailing_90_days":
      return series.filter((m) => m.months_ago <= 2);
    case "trailing_12_months":
      return series.filter((m) => m.months_ago <= 11);
    case "custom":
      return series;
  }
}

/** Sort 12-month series oldest-first for chart rendering. */
export function chronological<T extends { months_ago: number }>(series: T[]): T[] {
  return [...series].sort((a, b) => b.months_ago - a.months_ago);
}

/** Format a US dollar value compactly: $1.2M, $843K, $412. */
export function formatMoney(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

/** Format a percentage with one decimal. */
export function formatPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

/** Format days with the right unit. */
export function formatDays(n: number): string {
  return `${n.toFixed(0)}d`;
}

/** Bucket open work orders into aging tiers for visual encoding. */
export function ageTier(daysOpen: number): "ok" | "watch" | "critical" {
  if (daysOpen > 90) return "critical";
  if (daysOpen > 60) return "watch";
  return "ok";
}

// Re-export MonthlyClosures so consumers don't need to import types separately
export type { MonthlyClosures };
