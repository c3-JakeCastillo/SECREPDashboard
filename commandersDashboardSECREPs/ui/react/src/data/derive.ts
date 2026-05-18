import type {
  MonthlyClosures,
  MonthlyInventoryFlow,
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

/** How many months back a TimeRange covers (for label display). */
export function timeRangeLabel(range: TimeRange): string {
  switch (range) {
    case "current_month":   return "Current Month";
    case "last_30_days":    return "Last 30 Days";
    case "trailing_90_days": return "Trailing 90 Days";
    case "trailing_12_months": return "Trailing 12 Months";
    case "custom":          return "All Data";
  }
}

/** Sort 12-month series oldest-first for chart rendering. */
export function chronological<T extends { months_ago: number }>(series: T[]): T[] {
  return [...series].sort((a, b) => b.months_ago - a.months_ago);
}

/**
 * Aggregate multiple months of MonthlyClosures into a single synthetic
 * MonthlySourcePerformance for a given labor source key.
 */
export function aggregateSource(
  months: MonthlyClosures[],
  source: "marine" | "v2x" | "logcom"
) {
  const count     = months.reduce((s, m) => s + m[source].count, 0);
  const successes = months.reduce((s, m) => s + m[source].successes, 0);
  const savings   = months.reduce((s, m) => s + m[source].cost_savings, 0);
  const cwtSum    = months.reduce((s, m) => s + m[source].avg_cwt_days * m[source].count, 0);
  return {
    count,
    successes,
    repair_rate: count > 0 ? successes / count : 0,
    avg_cwt_days: count > 0 ? cwtSum / count : 0,
    cost_savings: savings,
  };
}

/**
 * Aggregate multiple months of inventory flow into a single totals object.
 * Used by InventorySankey when a multi-month range is selected.
 */
export function aggregateInventoryFlow(months: MonthlyInventoryFlow[]): MonthlyInventoryFlow {
  const sum = (key: keyof MonthlyInventoryFlow) =>
    months.reduce((s, m) => s + (m[key] as number), 0);
  return {
    month: months[0]?.month ?? "",
    months_ago: months[0]?.months_ago ?? 0,
    straight_buy_serv:    sum("straight_buy_serv"),
    mrp_credit_serv:      sum("mrp_credit_serv"),
    initial_issue_serv:   sum("initial_issue_serv"),
    ima_repair_serv:      sum("ima_repair_serv"),
    ima_repair_washout:   sum("ima_repair_washout"),
    v2x_repair_serv:      sum("v2x_repair_serv"),
    v2x_repair_washout:   sum("v2x_repair_washout"),
    logcom_repair_serv:   sum("logcom_repair_serv"),
    logcom_repair_washout: sum("logcom_repair_washout"),
    unit_turnin_unserv:   sum("unit_turnin_unserv"),
    customer_issue_serv:  sum("customer_issue_serv"),
  };
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

// Re-export types so consumers don't need to import from types directly
export type { MonthlyClosures, MonthlyInventoryFlow };
