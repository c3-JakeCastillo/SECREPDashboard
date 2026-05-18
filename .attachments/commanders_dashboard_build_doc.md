# C3 Code Build Doc — Commanders Dashboard for SECREPs

**Status:** Ready to scaffold
**Tech stack:** React 18 + TypeScript + Vite + Tailwind CSS + Recharts
**Data:** Local `seed.json` (12 months of synthetic 1st Maintenance Battalion activity)
**Target:** Single-page interactive dashboard, laptop + briefing-room display (1440×900 min, 1920×1080 optimal)

---

## How to use this doc

This is a single self-contained scaffold for C3 Code. Paste this whole document as your prompt and ask C3 Code to create every file in the order listed. The build is broken into three parts:

1. **Part 1 — Project scaffold and design system.** Vite config, Tailwind, color tokens, types, derive utilities. Boring but load-bearing.
2. **Part 2 — Component shells, wired to seed.** Header, KPI tiles, two modules (IMA, RIP), integrated view, callout bar. KPI tiles are functional end-to-end against the seed; other components are scaffolded with the right props and data binding but minimal visual chrome — fill them out iteratively.
3. **Part 3 — Git connector prompts.** Ready-to-paste prompts for the GitHub MCP connector once you wire it up. Covers initial commit, branch-per-feature workflow, PR descriptions, and milestone tagging.

Place the `seed.json` file (generated separately, ~1.3MB) at `/src/data/seed.json` before running. The schema is documented in Part 1, Section 1.4.

---

# PART 1 — Project scaffold and design system

## 1.1 Project initialization

Run from the project root:

```bash
npm create vite@latest commanders-dashboard -- --template react-ts
cd commanders-dashboard
npm install
npm install -D tailwindcss postcss autoprefixer @types/node
npm install recharts lucide-react html-to-image clsx
npx tailwindcss init -p
```

## 1.2 `tailwind.config.js`

Replace the generated file with this. Note the custom color tokens — these come from the design system in the build brief and must be used consistently across components.

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand
        navy: "#0B2545",         // Primary text, headers
        scarlet: "#8E2932",      // Marine labor series, primary accent (sparingly)
        steel: "#5C6B73",        // Secondary text, gridlines
        // Series
        contractorBlue: "#1F4E79", // Contracted labor series
        // Surfaces
        canvas: "#F7F8FA",       // Page background
        surface: "#FFFFFF",      // Card surface
        // Status (paired with shape/label, never color alone)
        success: "#1F7A4D",
        warning: "#C77700",
        critical: "#B3261E",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      fontFeatureSettings: {
        tabular: '"tnum", "lnum"',
      },
    },
  },
  plugins: [],
};
```

## 1.3 `src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html { font-family: 'Inter', system-ui, sans-serif; }
  body { @apply bg-canvas text-navy antialiased; }

  /* Tabular numerals everywhere — KPIs must align */
  .num { font-variant-numeric: tabular-nums; }
}

@layer components {
  .card {
    @apply bg-surface rounded-lg border border-slate-200 p-4 shadow-sm;
  }
  .kpi-label {
    @apply text-xs uppercase tracking-wide text-steel font-medium;
  }
  .kpi-value {
    @apply text-3xl font-semibold text-navy num leading-none mt-1;
  }
  .kpi-sub {
    @apply text-xs text-steel mt-1 num;
  }
}
```

## 1.4 `src/types.ts`

The full type system, derived from the seed schema. Every entity in the app is typed.

```ts
// === Core entities ===

export type WorkOrderStatus =
  | "Inducted"
  | "InWork"
  | "AwaitingParts"
  | "AwaitingQA"
  | "ReadyForReturn"
  | "Closed";

export type LaborType = "Marine" | "Contracted";
export type Outcome = "CodeB_Success" | "CodeF_WIR" | null;
export type RepairSource = "IMA" | "V2X" | "LOGCOM";

export interface ServiceRequest {
  id: string;
  nsn: string;
  nomenclature: string;
  status: WorkOrderStatus;
  induction_date: string;          // ISO YYYY-MM-DD
  close_date: string | null;
  labor_type: LaborType;
  outcome: Outcome;
  replacement_cost: number;
  assigned_tech: string;
  repair_source: RepairSource;
}

export interface InventoryItem {
  nsn: string;
  nomenclature: string;
  allowance_qty: number;
  on_hand_serviceable: number;
  on_hand_unserviceable: number;
  on_order_qty: number;
  on_order_eta: string | null;
  reorder_point: number;
  unit_replacement_cost: number;
  _note?: string;                  // Suggested action for low-stock callout
}

export interface RepairJob {
  service_request_id: string;
  repair_source: RepairSource;
  cost: number;
  cost_savings: number;
  outcome: Outcome;
  close_date: string;
}

export interface MonthlySourcePerformance {
  count: number;
  successes: number;
  repair_rate: number;             // 0-1
  avg_cwt_days: number;
  cost_savings: number;
}

export interface MonthlyClosures {
  month: string;                   // "YYYY-MM"
  months_ago: number;
  total_closed: number;
  marine: MonthlySourcePerformance;
  v2x: MonthlySourcePerformance;
  logcom: MonthlySourcePerformance;
}

export interface MonthlyInventoryFlow {
  month: string;
  months_ago: number;
  straight_buy_serv: number;
  mrp_credit_serv: number;
  initial_issue_serv: number;
  ima_repair_serv: number;
  ima_repair_washout: number;
  v2x_repair_serv: number;
  v2x_repair_washout: number;
  logcom_repair_serv: number;
  logcom_repair_washout: number;
  unit_turnin_unserv: number;
  customer_issue_serv: number;
}

export interface BudgetLedger {
  fiscal_year: string;
  fy_start_date: string;
  fy_end_date: string;
  planned_allocation: number;
  received_to_date: number;
  total_obligated: number;
  obligations_by_category: {
    straight_buy: number;
    mrp: number;
    three_pl_v2x: number;
    logcom: number;
  };
  shortfall_by_category: {
    straight_buy: number;
    mrp: number;
    three_pl_v2x: number;
    logcom: number;
  };
  total_shortfall: number;
  pct_received: number;
  pct_obligated: number;
  cumulative_obligation_by_month: { fy_month: string; cumulative: number }[];
  cumulative_receipt_by_month: { fy_month: string; cumulative: number }[];
}

export interface KpiSnapshot {
  as_of: string;
  ima: {
    open_work_orders: number;
    aging_over_90_days: number;
    repair_rate_pct_current_month: number;
    avg_customer_wait_time_days_current_month: number;
    cost_savings_current_month: number;
  };
  rip: {
    inventory_health_pct: number;
    allowance_fulfillment_pct: number;
    zero_stock_count: number;
    low_stock_count: number;
    budget_obligated_pct: number;
    budget_shortfall: number;
  };
}

export interface AgingItem {
  id: string;
  nsn: string;
  nomenclature: string;
  days_open: number;
  status: WorkOrderStatus;
  assigned_tech: string;
  labor_type: LaborType;
}

export interface InventoryHealth {
  total_serviceable: number;
  total_unserviceable: number;
  total_on_order: number;
  total_allowance: number;
  zero_stock_count: number;
  low_stock_count: number;
  health_pct: number;
  allowance_fulfillment_pct: number;
}

// === Root seed shape ===

export interface SeedData {
  meta: {
    generated_at: string;
    unit: string;
    classification: string;
    as_of_date: string;
    fiscal_year: string;
    description: string;
    seeded_anomalies: string[];
  };
  kpi_snapshot: KpiSnapshot;
  commander_callout: string;
  service_requests: ServiceRequest[];
  open_work_orders_summary: {
    total: number;
    by_status: Record<WorkOrderStatus, number>;
    aging_over_90_days: number;
    aging_items: AgingItem[];
  };
  inventory_items: InventoryItem[];
  inventory_health: InventoryHealth;
  low_and_zero_stock_items: InventoryItem[];
  inventory_transactions: {
    month: string;
    source: string;
    qty: number;
    condition: "Serviceable" | "Unserviceable";
    direction: "In" | "Out";
  }[];
  monthly_inventory_flow: MonthlyInventoryFlow[];
  repair_jobs: RepairJob[];
  monthly_closures: MonthlyClosures[];
  budget_ledger: BudgetLedger;
  repair_source_summary_current_month: {
    ima: MonthlySourcePerformance & { total_cost: number };
    v2x: MonthlySourcePerformance & { total_cost: number };
    logcom: MonthlySourcePerformance & { total_cost: number };
  } | null;
}

// === UI state ===

export type TimeRange =
  | "current_month"
  | "last_30_days"
  | "trailing_90_days"
  | "trailing_12_months"
  | "custom";

export type ModuleView = "integrated" | "ima_only" | "rip_only";
```

## 1.5 `src/data/loadSeed.ts`

A thin loader that imports `seed.json` and returns typed data. Keeps the rest of the app from knowing about the JSON file.

```ts
import seed from "./seed.json";
import type { SeedData } from "../types";

export const seedData: SeedData = seed as unknown as SeedData;
```

## 1.6 `src/data/derive.ts`

All derived-metric logic lives here. Components consume the helpers in this file; they do not compute metrics inline. This keeps the metric formulas auditable and consistent with the proposal.

```ts
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
```

---

# PART 2 — Component shells

## 2.1 Application shell

### `src/App.tsx`

Top-level routing between Integrated / IMA-only / RIP-only views, plus the global header.

```tsx
import { useState } from "react";
import Header from "./components/shared/Header";
import IntegratedView from "./components/integrated/IntegratedView";
import IMAModule from "./components/ima/IMAModule";
import RIPModule from "./components/rip/RIPModule";
import type { ModuleView, TimeRange } from "./types";

export default function App() {
  const [moduleView, setModuleView] = useState<ModuleView>("integrated");
  const [timeRange, setTimeRange] = useState<TimeRange>("current_month");

  return (
    <div className="min-h-screen bg-canvas">
      <Header
        moduleView={moduleView}
        onModuleViewChange={setModuleView}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />
      <main className="max-w-[1920px] mx-auto px-6 py-6">
        {moduleView === "integrated" && <IntegratedView timeRange={timeRange} />}
        {moduleView === "ima_only" && <IMAModule timeRange={timeRange} />}
        {moduleView === "rip_only" && <RIPModule timeRange={timeRange} />}
      </main>
    </div>
  );
}
```

### `src/main.tsx`

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

## 2.2 Shared components

### `src/components/shared/Header.tsx`

```tsx
import { Download } from "lucide-react";
import { seedData } from "../../data/loadSeed";
import type { ModuleView, TimeRange } from "../../types";

interface Props {
  moduleView: ModuleView;
  onModuleViewChange: (v: ModuleView) => void;
  timeRange: TimeRange;
  onTimeRangeChange: (r: TimeRange) => void;
}

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  current_month: "Current Month",
  last_30_days: "Last 30 Days",
  trailing_90_days: "Trailing 90 Days",
  trailing_12_months: "Trailing 12 Months",
  custom: "Custom",
};

const MODULE_LABELS: Record<ModuleView, string> = {
  integrated: "Integrated",
  ima_only: "IMA Only",
  rip_only: "RIP Only",
};

export default function Header({
  moduleView,
  onModuleViewChange,
  timeRange,
  onTimeRangeChange,
}: Props) {
  const { meta } = seedData;

  return (
    <header className="bg-navy text-white">
      {/* Classification banner */}
      <div className="bg-warning text-center text-xs font-semibold py-1 tracking-widest">
        {meta.classification}
      </div>
      <div className="max-w-[1920px] mx-auto px-6 py-3 flex items-center justify-between">
        <div>
          <div className="text-sm uppercase tracking-wide opacity-80">
            Commanders Dashboard for SECREPs
          </div>
          <div className="text-xl font-semibold">{meta.unit}</div>
          <div className="text-xs opacity-70 num">As of {meta.as_of_date}</div>
        </div>

        <div className="flex items-center gap-3">
          {/* Module toggle */}
          <div className="bg-white/10 rounded-md p-1 flex text-sm">
            {(["integrated", "ima_only", "rip_only"] as ModuleView[]).map((v) => (
              <button
                key={v}
                onClick={() => onModuleViewChange(v)}
                className={`px-3 py-1.5 rounded ${
                  moduleView === v
                    ? "bg-white text-navy font-medium"
                    : "text-white/80 hover:text-white"
                }`}
              >
                {MODULE_LABELS[v]}
              </button>
            ))}
          </div>

          {/* Time range */}
          <select
            value={timeRange}
            onChange={(e) => onTimeRangeChange(e.target.value as TimeRange)}
            className="bg-white/10 text-white border border-white/20 rounded-md px-3 py-1.5 text-sm"
          >
            {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((r) => (
              <option key={r} value={r} className="text-navy">
                {TIME_RANGE_LABELS[r]}
              </option>
            ))}
          </select>

          {/* Export */}
          <button
            className="bg-scarlet hover:bg-scarlet/90 text-white px-3 py-1.5 rounded-md text-sm flex items-center gap-2"
            onClick={() => exportPng()}
          >
            <Download size={14} />
            Export
          </button>
        </div>
      </div>
    </header>
  );
}

async function exportPng() {
  // Implementation: html-to-image to capture the integrated view at 1920×1080
  // and trigger a download. Stubbed for initial scaffold.
  const target = document.getElementById("integrated-view-export-root");
  if (!target) {
    alert("Export only available on Integrated view.");
    return;
  }
  const { toPng } = await import("html-to-image");
  const dataUrl = await toPng(target, { width: 1920, height: 1080, pixelRatio: 1 });
  const link = document.createElement("a");
  link.download = `commanders-dashboard-${new Date().toISOString().slice(0, 10)}.png`;
  link.href = dataUrl;
  link.click();
}
```

### `src/components/shared/KPITile.tsx`

**Fully functional.** This is the most-used building block in the dashboard. Six visual variants by status.

```tsx
import clsx from "clsx";

interface Props {
  label: string;
  value: string;
  sub?: string;
  status?: "ok" | "watch" | "critical" | "neutral";
  target?: string;
}

export default function KPITile({ label, value, sub, status = "neutral", target }: Props) {
  const accentBar = clsx(
    "h-1 w-full rounded-t-lg",
    status === "ok" && "bg-success",
    status === "watch" && "bg-warning",
    status === "critical" && "bg-critical",
    status === "neutral" && "bg-steel/30"
  );

  const valueColor = clsx(
    status === "critical" && "text-critical",
    status === "watch" && "text-warning",
    (status === "ok" || status === "neutral") && "text-navy"
  );

  return (
    <div className="card !p-0 overflow-hidden">
      <div className={accentBar} />
      <div className="p-4">
        <div className="kpi-label">{label}</div>
        <div className={clsx("kpi-value", valueColor)}>{value}</div>
        {sub && <div className="kpi-sub">{sub}</div>}
        {target && (
          <div className="text-xs text-steel/80 mt-1 num">Target: {target}</div>
        )}
      </div>
    </div>
  );
}
```

### `src/components/shared/Sparkline.tsx`

Tiny line chart for the 12-month trend strip. Built on Recharts.

```tsx
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Props {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
}

export default function Sparkline({ data, color = "#0B2545", height = 50 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
        <XAxis dataKey="label" hide />
        <YAxis hide domain={["auto", "auto"]} />
        <Tooltip
          contentStyle={{ fontSize: 12, padding: "4px 8px" }}
          labelStyle={{ color: "#5C6B73" }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

## 2.3 IMA module

### `src/components/ima/IMAModule.tsx`

Wires up four KPI tiles against the seed and embeds the workload, labor comparison, and trends. The KPI strip is fully functional; the panels below are stub-shells with the right data wired in.

```tsx
import { seedData } from "../../data/loadSeed";
import { formatMoney, formatPct, formatDays } from "../../data/derive";
import KPITile from "../shared/KPITile";
import WorkloadWidget from "./WorkloadWidget";
import LaborComparison from "./LaborComparison";
import IMATrends from "./IMATrends";
import type { TimeRange } from "../../types";

interface Props { timeRange: TimeRange }

export default function IMAModule({ timeRange }: Props) {
  const { kpi_snapshot } = seedData;
  const ima = kpi_snapshot.ima;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-4 gap-4">
        <KPITile
          label="Open Work Orders"
          value={ima.open_work_orders.toString()}
          sub={`${ima.aging_over_90_days} aging > 90 days`}
          status={ima.aging_over_90_days > 0 ? "critical" : "ok"}
        />
        <KPITile
          label="Repair Rate (Month)"
          value={formatPct(ima.repair_rate_pct_current_month)}
          target="85.0%"
          status={ima.repair_rate_pct_current_month >= 85 ? "ok" : "watch"}
        />
        <KPITile
          label="Customer Wait Time"
          value={formatDays(ima.avg_customer_wait_time_days_current_month)}
          target="30d"
          status={
            ima.avg_customer_wait_time_days_current_month <= 30 ? "ok" : "watch"
          }
        />
        <KPITile
          label="Cost Savings (Month)"
          value={formatMoney(ima.cost_savings_current_month)}
          sub="Code B repairs avoided replacement"
          status="ok"
        />
      </section>

      <WorkloadWidget timeRange={timeRange} />
      <LaborComparison timeRange={timeRange} />
      <IMATrends timeRange={timeRange} />
    </div>
  );
}
```

### `src/components/ima/WorkloadWidget.tsx`

```tsx
import { seedData } from "../../data/loadSeed";
import { AlertTriangle } from "lucide-react";
import type { TimeRange } from "../../types";

interface Props { timeRange: TimeRange }

export default function WorkloadWidget({ timeRange: _ }: Props) {
  const { open_work_orders_summary: summary } = seedData;

  return (
    <section className="card">
      <h3 className="text-base font-semibold text-navy mb-3">Current Workload</h3>
      <div className="grid grid-cols-6 gap-4">
        <div>
          <div className="kpi-label">Total Open</div>
          <div className="kpi-value">{summary.total}</div>
        </div>
        {Object.entries(summary.by_status).map(([status, count]) => (
          <div key={status}>
            <div className="kpi-label">{status.replace(/([A-Z])/g, " $1").trim()}</div>
            <div className="kpi-value">{count}</div>
          </div>
        ))}
      </div>

      {summary.aging_over_90_days > 0 && (
        <div className="mt-4 border-l-4 border-critical bg-critical/5 p-3 rounded-r">
          <div className="flex items-center gap-2 text-critical font-semibold">
            <AlertTriangle size={16} />
            {summary.aging_over_90_days} work orders aging over 90 days
          </div>
          <details className="mt-2">
            <summary className="text-sm text-steel cursor-pointer hover:text-navy">
              View aging work orders
            </summary>
            <table className="w-full mt-3 text-sm">
              <thead>
                <tr className="text-left text-steel text-xs uppercase">
                  <th className="py-1">WO #</th>
                  <th>NSN</th>
                  <th>Nomenclature</th>
                  <th>Days Open</th>
                  <th>Status</th>
                  <th>Tech</th>
                </tr>
              </thead>
              <tbody>
                {summary.aging_items.map((wo) => (
                  <tr key={wo.id} className="border-t border-slate-100">
                    <td className="py-2 font-mono text-xs">{wo.id}</td>
                    <td className="font-mono text-xs">{wo.nsn}</td>
                    <td>{wo.nomenclature}</td>
                    <td className="num text-critical font-semibold">{wo.days_open}</td>
                    <td>{wo.status}</td>
                    <td className="text-xs">{wo.assigned_tech}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>
      )}
    </section>
  );
}
```

### `src/components/ima/LaborComparison.tsx`

```tsx
import { seedData } from "../../data/loadSeed";
import { formatMoney, formatPct, formatDays } from "../../data/derive";
import type { TimeRange } from "../../types";

interface Props { timeRange: TimeRange }

export default function LaborComparison({ timeRange: _ }: Props) {
  const current = seedData.monthly_closures.find((m) => m.months_ago === 0);
  if (!current) return null;

  const marine = current.marine;
  const v2x = current.v2x;

  return (
    <section className="card">
      <h3 className="text-base font-semibold text-navy mb-3">
        Labor Performance — Marine vs. Contracted (Current Month)
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <LaborCard
          name="Marine Labor"
          color="scarlet"
          count={marine.count}
          repairRate={marine.repair_rate * 100}
          cwt={marine.avg_cwt_days}
          savings={marine.cost_savings}
        />
        <LaborCard
          name="Contracted Labor (V2X)"
          color="contractorBlue"
          count={v2x.count}
          repairRate={v2x.repair_rate * 100}
          cwt={v2x.avg_cwt_days}
          savings={v2x.cost_savings}
        />
      </div>
    </section>
  );
}

interface CardProps {
  name: string;
  color: "scarlet" | "contractorBlue";
  count: number;
  repairRate: number;
  cwt: number;
  savings: number;
}

function LaborCard({ name, color, count, repairRate, cwt, savings }: CardProps) {
  const accent = color === "scarlet" ? "bg-scarlet" : "bg-contractorBlue";
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className={`${accent} text-white px-4 py-2 font-semibold text-sm`}>
        {name}
      </div>
      <div className="grid grid-cols-2 gap-4 p-4">
        <div>
          <div className="kpi-label">Completed</div>
          <div className="kpi-value">{count}</div>
        </div>
        <div>
          <div className="kpi-label">Repair Rate</div>
          <div className="kpi-value">{formatPct(repairRate)}</div>
          <div className="kpi-sub">Target 85.0%</div>
        </div>
        <div>
          <div className="kpi-label">Customer Wait Time</div>
          <div className="kpi-value">{formatDays(cwt)}</div>
          <div className="kpi-sub">Target 30d</div>
        </div>
        <div>
          <div className="kpi-label">Cost Savings</div>
          <div className="kpi-value">{formatMoney(savings)}</div>
        </div>
      </div>
    </div>
  );
}
```

### `src/components/ima/IMATrends.tsx`

```tsx
import { seedData } from "../../data/loadSeed";
import { chronological, formatMoney } from "../../data/derive";
import Sparkline from "../shared/Sparkline";
import type { TimeRange } from "../../types";

interface Props { timeRange: TimeRange }

export default function IMATrends({ timeRange: _ }: Props) {
  const series = chronological(seedData.monthly_closures);
  const labels = series.map((m) => m.month.slice(2));

  const closuresData = series.map((m, i) => ({ label: labels[i], value: m.total_closed }));
  const marineRateData = series.map((m, i) => ({ label: labels[i], value: m.marine.repair_rate * 100 }));
  const v2xRateData = series.map((m, i) => ({ label: labels[i], value: m.v2x.repair_rate * 100 }));
  const savingsData = series.map((m, i) => ({
    label: labels[i],
    value: m.marine.cost_savings + m.v2x.cost_savings + m.logcom.cost_savings,
  }));

  return (
    <section className="card">
      <h3 className="text-base font-semibold text-navy mb-3">12-Month Trends</h3>
      <div className="grid grid-cols-4 gap-4">
        <TrendBox label="Closures / Month" data={closuresData} color="#0B2545" />
        <TrendBox label="Marine Repair Rate" data={marineRateData} color="#8E2932" subFormat="pct" />
        <TrendBox label="V2X Repair Rate" data={v2xRateData} color="#1F4E79" subFormat="pct" />
        <TrendBox label="Total Cost Savings" data={savingsData} color="#1F7A4D" subFormat="money" />
      </div>
    </section>
  );
}

function TrendBox({
  label,
  data,
  color,
  subFormat,
}: {
  label: string;
  data: { label: string; value: number }[];
  color: string;
  subFormat?: "pct" | "money";
}) {
  const latest = data[data.length - 1]?.value ?? 0;
  const formatted =
    subFormat === "pct" ? `${latest.toFixed(1)}%`
    : subFormat === "money" ? formatMoney(latest)
    : latest.toFixed(0);
  return (
    <div>
      <div className="kpi-label">{label}</div>
      <div className="text-lg font-semibold text-navy num">{formatted}</div>
      <div className="mt-2"><Sparkline data={data} color={color} height={40} /></div>
    </div>
  );
}
```

## 2.4 RIP module

### `src/components/rip/RIPModule.tsx`

```tsx
import { seedData } from "../../data/loadSeed";
import { formatMoney, formatPct } from "../../data/derive";
import KPITile from "../shared/KPITile";
import InventoryPosture from "./InventoryPosture";
import LowStockTable from "./LowStockTable";
import SourceComparison from "./SourceComparison";
import BudgetTracker from "./BudgetTracker";
import type { TimeRange } from "../../types";

interface Props { timeRange: TimeRange }

export default function RIPModule({ timeRange }: Props) {
  const { kpi_snapshot } = seedData;
  const rip = kpi_snapshot.rip;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-4 gap-4">
        <KPITile
          label="Inventory Health"
          value={formatPct(rip.inventory_health_pct)}
          sub="Serviceable / total on hand"
          status={rip.inventory_health_pct >= 85 ? "ok" : "watch"}
        />
        <KPITile
          label="Stockout Items"
          value={rip.zero_stock_count.toString()}
          sub={`${rip.low_stock_count} additional low-stock`}
          status={rip.zero_stock_count > 0 ? "critical" : "ok"}
        />
        <KPITile
          label="Budget Obligated"
          value={formatPct(rip.budget_obligated_pct)}
          sub="of FY26 planned"
          status={rip.budget_obligated_pct <= 90 ? "ok" : "watch"}
        />
        <KPITile
          label="Budget Shortfall"
          value={formatMoney(rip.budget_shortfall)}
          sub="Mostly 3PL contracts"
          status={rip.budget_shortfall > 500_000 ? "critical" : "ok"}
        />
      </section>

      <InventoryPosture timeRange={timeRange} />
      <LowStockTable />
      <SourceComparison timeRange={timeRange} />
      <BudgetTracker />
    </div>
  );
}
```

### `src/components/rip/InventoryPosture.tsx`

```tsx
import { seedData } from "../../data/loadSeed";
import { formatPct } from "../../data/derive";
import type { TimeRange } from "../../types";

interface Props { timeRange: TimeRange }

export default function InventoryPosture({ timeRange: _ }: Props) {
  const h = seedData.inventory_health;
  const total = h.total_allowance;
  const serv = h.total_serviceable;
  const unserv = h.total_unserviceable;
  const onOrder = h.total_on_order;
  const gap = Math.max(0, total - (serv + unserv + onOrder));

  const segments = [
    { label: "Serviceable", qty: serv, color: "bg-success" },
    { label: "Unserviceable", qty: unserv, color: "bg-warning" },
    { label: "On Order", qty: onOrder, color: "bg-steel" },
    { label: "Gap", qty: gap, color: "bg-critical/40" },
  ];

  return (
    <section className="card">
      <h3 className="text-base font-semibold text-navy mb-3">Inventory Posture</h3>
      <div className="text-xs text-steel mb-2 num">
        Allowance fulfillment: {formatPct(h.allowance_fulfillment_pct)} of {total} authorized
      </div>
      <div className="h-8 flex rounded overflow-hidden border border-slate-200">
        {segments.map((s) =>
          s.qty > 0 ? (
            <div
              key={s.label}
              className={`${s.color} flex items-center justify-center text-white text-xs`}
              style={{ width: `${(s.qty / total) * 100}%` }}
              title={`${s.label}: ${s.qty}`}
            >
              {(s.qty / total) * 100 > 5 ? s.label : ""}
            </div>
          ) : null
        )}
      </div>
      <div className="grid grid-cols-4 gap-4 mt-4">
        {segments.map((s) => (
          <div key={s.label}>
            <div className="flex items-center gap-2">
              <span className={`${s.color} w-3 h-3 rounded`} />
              <span className="kpi-label">{s.label}</span>
            </div>
            <div className="kpi-value">{s.qty.toLocaleString()}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

### `src/components/rip/LowStockTable.tsx`

```tsx
import { seedData } from "../../data/loadSeed";

export default function LowStockTable() {
  const items = seedData.low_and_zero_stock_items.slice(0, 15);
  return (
    <section className="card">
      <h3 className="text-base font-semibold text-navy mb-3">Low & Zero Stock</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-steel text-xs uppercase">
            <th className="py-1">NSN</th>
            <th>Nomenclature</th>
            <th className="text-right">Allow</th>
            <th className="text-right">On Hand</th>
            <th className="text-right">On Order</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.nsn} className="border-t border-slate-100">
              <td className="py-2 font-mono text-xs">{i.nsn}</td>
              <td>{i.nomenclature}</td>
              <td className="text-right num">{i.allowance_qty}</td>
              <td className={`text-right num ${i.on_hand_serviceable === 0 ? "text-critical font-semibold" : "text-warning"}`}>
                {i.on_hand_serviceable}
              </td>
              <td className="text-right num">{i.on_order_qty}</td>
              <td className="text-xs text-steel">{i._note ?? "Reorder review"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

### `src/components/rip/SourceComparison.tsx`

```tsx
import { seedData } from "../../data/loadSeed";
import { formatMoney, formatPct } from "../../data/derive";
import type { TimeRange } from "../../types";

interface Props { timeRange: TimeRange }

export default function SourceComparison({ timeRange: _ }: Props) {
  const summary = seedData.repair_source_summary_current_month;
  if (!summary) return null;

  const rows = [
    { name: "IMA", color: "bg-scarlet", ...summary.ima },
    { name: "Raytheon V2X", color: "bg-contractorBlue", ...summary.v2x },
    { name: "LOGCOM", color: "bg-steel", ...summary.logcom },
  ];

  const bestValue = rows.reduce((best, r) =>
    r.total_cost > 0 && r.cost_savings / r.total_cost > (best?.cost_savings ?? 0) / (best?.total_cost ?? 1)
      ? r : best, rows[0]);

  return (
    <section className="card">
      <h3 className="text-base font-semibold text-navy mb-3">
        Repair Source Comparison (Current Month)
      </h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-steel text-xs uppercase">
            <th className="py-2">Source</th>
            <th className="text-right">Repaired</th>
            <th className="text-right">Repair Rate</th>
            <th className="text-right">Total Cost</th>
            <th className="text-right">Cost Savings</th>
            <th className="text-right">Avg CWT</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-t border-slate-100">
              <td className="py-2">
                <span className={`${r.color} text-white px-2 py-0.5 rounded text-xs font-semibold`}>
                  {r.name}
                </span>
              </td>
              <td className="text-right num">{r.successes} / {r.count}</td>
              <td className="text-right num">{formatPct(r.repair_rate * 100)}</td>
              <td className="text-right num">{formatMoney(r.total_cost)}</td>
              <td className="text-right num text-success font-semibold">{formatMoney(r.cost_savings)}</td>
              <td className="text-right num">{r.avg_cwt_days.toFixed(0)}d</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 text-sm text-success">
        <span className="font-semibold">Best value this period:</span> {bestValue.name} —
        ${(bestValue.cost_savings / Math.max(bestValue.total_cost, 1)).toFixed(2)} saved per dollar obligated
      </div>
    </section>
  );
}
```

### `src/components/rip/BudgetTracker.tsx`

```tsx
import { seedData } from "../../data/loadSeed";
import { formatMoney, formatPct } from "../../data/derive";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

export default function BudgetTracker() {
  const b = seedData.budget_ledger;

  const burnData = b.cumulative_obligation_by_month.map((o, i) => ({
    month: o.fy_month.slice(0, 3),
    obligated: o.cumulative,
    received: b.cumulative_receipt_by_month[i]?.cumulative ?? 0,
    ideal: (b.planned_allocation / 12) * (i + 1),
  }));

  return (
    <section className="card">
      <h3 className="text-base font-semibold text-navy mb-3">Budget Execution — FY26</h3>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div>
          <div className="kpi-label">Planned</div>
          <div className="kpi-value">{formatMoney(b.planned_allocation)}</div>
        </div>
        <div>
          <div className="kpi-label">Received</div>
          <div className="kpi-value">{formatMoney(b.received_to_date)}</div>
          <div className="kpi-sub">{formatPct(b.pct_received)}</div>
        </div>
        <div>
          <div className="kpi-label">Obligated</div>
          <div className="kpi-value">{formatMoney(b.total_obligated)}</div>
          <div className="kpi-sub">{formatPct(b.pct_obligated)}</div>
        </div>
        <div>
          <div className="kpi-label">Shortfall</div>
          <div className="kpi-value text-critical">{formatMoney(b.total_shortfall)}</div>
          <div className="kpi-sub">3PL: {formatMoney(b.shortfall_by_category.three_pl_v2x)}</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={burnData}>
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5C6B73" }} />
          <YAxis
            tick={{ fontSize: 11, fill: "#5C6B73" }}
            tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`}
          />
          <Tooltip
            formatter={(v: number) => formatMoney(v)}
            labelStyle={{ color: "#0B2545" }}
            contentStyle={{ fontSize: 12 }}
          />
          <ReferenceLine
            y={b.planned_allocation}
            stroke="#5C6B73"
            strokeDasharray="3 3"
            label={{ value: "Planned", fontSize: 10, fill: "#5C6B73" }}
          />
          <Line type="monotone" dataKey="ideal" stroke="#5C6B73" strokeDasharray="4 4" dot={false} name="Ideal" />
          <Line type="monotone" dataKey="received" stroke="#1F7A4D" strokeWidth={2} dot={false} name="Received" />
          <Line type="monotone" dataKey="obligated" stroke="#8E2932" strokeWidth={2} dot={false} name="Obligated" />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
```

## 2.5 Integrated view

### `src/components/integrated/IntegratedView.tsx`

The marquee 1920×1080 single-slide layout. Reuses the module components inside a tighter grid, with the callout bar at the bottom.

```tsx
import { seedData } from "../../data/loadSeed";
import { formatMoney, formatPct, formatDays } from "../../data/derive";
import KPITile from "../shared/KPITile";
import WorkloadWidget from "../ima/WorkloadWidget";
import LaborComparison from "../ima/LaborComparison";
import InventoryPosture from "../rip/InventoryPosture";
import SourceComparison from "../rip/SourceComparison";
import IMATrends from "../ima/IMATrends";
import CalloutBar from "./CalloutBar";
import type { TimeRange } from "../../types";

interface Props { timeRange: TimeRange }

export default function IntegratedView({ timeRange }: Props) {
  const { kpi_snapshot } = seedData;
  const { ima, rip } = kpi_snapshot;

  return (
    <div id="integrated-view-export-root" className="space-y-4 bg-canvas">
      {/* Hero KPI strip — 8 numbers */}
      <section className="grid grid-cols-8 gap-3">
        <KPITile label="Open WOs" value={ima.open_work_orders.toString()}
          status={ima.aging_over_90_days > 0 ? "critical" : "ok"}
          sub={`${ima.aging_over_90_days} aging >90d`} />
        <KPITile label="Repair Rate" value={formatPct(ima.repair_rate_pct_current_month)}
          target="85%" status={ima.repair_rate_pct_current_month >= 85 ? "ok" : "watch"} />
        <KPITile label="CWT" value={formatDays(ima.avg_customer_wait_time_days_current_month)}
          target="30d" status={ima.avg_customer_wait_time_days_current_month <= 30 ? "ok" : "watch"} />
        <KPITile label="Savings (Month)" value={formatMoney(ima.cost_savings_current_month)}
          status="ok" />
        <KPITile label="Inv Health" value={formatPct(rip.inventory_health_pct)}
          status={rip.inventory_health_pct >= 85 ? "ok" : "watch"} />
        <KPITile label="Stockouts" value={rip.zero_stock_count.toString()}
          sub={`${rip.low_stock_count} low`}
          status={rip.zero_stock_count > 0 ? "critical" : "ok"} />
        <KPITile label="Budget Obl." value={formatPct(rip.budget_obligated_pct)}
          status={rip.budget_obligated_pct <= 90 ? "ok" : "watch"} />
        <KPITile label="Shortfall" value={formatMoney(rip.budget_shortfall)}
          status={rip.budget_shortfall > 500_000 ? "critical" : "ok"} />
      </section>

      {/* Two-column: IMA left, RIP right */}
      <section className="grid grid-cols-2 gap-4">
        <div className="space-y-4">
          <WorkloadWidget timeRange={timeRange} />
          <LaborComparison timeRange={timeRange} />
        </div>
        <div className="space-y-4">
          <InventoryPosture timeRange={timeRange} />
          <SourceComparison timeRange={timeRange} />
        </div>
      </section>

      {/* Full-width trends */}
      <section>
        <IMATrends timeRange={timeRange} />
      </section>

      {/* Commander's callout bar */}
      <CalloutBar />
    </div>
  );
}
```

### `src/components/integrated/CalloutBar.tsx`

```tsx
import { seedData } from "../../data/loadSeed";
import { AlertTriangle } from "lucide-react";

export default function CalloutBar() {
  const callout = seedData.commander_callout;
  return (
    <section className="bg-navy text-white rounded-lg px-6 py-4 flex items-center gap-4">
      <AlertTriangle size={20} className="text-warning shrink-0" />
      <div className="text-sm uppercase tracking-wide opacity-70">Commander's Brief:</div>
      <div className="text-base font-semibold flex-1 num">{callout}</div>
    </section>
  );
}
```

## 2.6 First-run verification

After scaffolding, run `npm run dev` and verify:

1. Header shows **1st Maintenance Battalion, 1st Marine Logistics Group**, classification banner reads UNCLASSIFIED // FOUO, "As of 2026-05-18".
2. The eight-tile hero KPI strip on the integrated view shows: Open WOs = 150, Repair Rate ~80%, CWT ~31d, Savings ~$827K, Inventory Health 90.1%, Stockouts = 3, Budget Obl. = 85%, Shortfall = $1.3M.
3. The commander's callout bar at the bottom reads: *"3 SECREPs at zero stock | $8.9M cost savings YTD | V2X repair rate down 21 points MoM | $1330K budget shortfall (3PL)"*.
4. The "aging > 90 days" callout in the workload widget is in red and expands to show six (6) work orders when clicked.

If any of those four checks fail, the wire-up between `seed.json` and the components is broken — fix that before doing visual polish.

---

# PART 3 — Git connector prompts

These prompts assume you've set up the GitHub MCP connector in C3 Code with write access to a repo named `commanders-dashboard-secreps`. Drop them in as needed.

## 3.1 Initial commit & repo seed

> Create a new public GitHub repo named `commanders-dashboard-secreps` under my user. Use the description "C3 AI Commanders Dashboard for SECREPs — USMC 1st Maintenance Battalion demo". Initialize with an MIT license and a Node `.gitignore`. Commit the full scaffold from the build doc into `main` in a single commit titled "scaffold: initial Vite + React + TS + Tailwind skeleton with seeded KPI tiles". Include `seed.json` in `src/data/`. Push.

## 3.2 README generation

> Create a `README.md` at the repo root covering: (a) what the project is, in one paragraph, framed for a Marine Corps battalion commander audience; (b) the seven decision questions the dashboard answers (pull these from the build doc Section "How I'll judge it"); (c) how to run locally (`npm install && npm run dev`); (d) the project structure as a tree; (e) where the seed data lives and how to regenerate it; (f) a "What's stubbed" section listing which components are functional and which are scaffolded shells. Commit with message "docs: project README".

## 3.3 Feature branch workflow

For each component being filled out beyond the initial scaffold, use this prompt template:

> Open a feature branch named `feat/<component-kebab-name>` from `main`. Implement the changes described below. When done, open a pull request to `main` with a description that includes (a) what changed in one sentence, (b) screenshots if visual, (c) the four-check verification list from the build doc Section 2.6 confirming nothing broke. Use the conventional-commit prefix `feat:` or `fix:` in the PR title.
>
> **This branch:** <describe the work>

## 3.4 Component-by-component build prompts

Drop these one at a time as you iterate. Each builds on the previous scaffold:

### 3.4.1 Workload widget — Sankey for inventory flows

> On a branch `feat/rip-inventory-sankey`, add a new component `src/components/rip/InventorySankey.tsx` that renders a Sankey diagram of the current-month inventory flows from `seed.json` -> `monthly_inventory_flow[0]`. Inbound nodes: Straight Buy, MRP Credit, Initial Issue, IMA Repair Return, IMA Washout, V2X Return, V2X Washout, LOGCOM Return, LOGCOM Washout, Unit Turn-in. Outbound: Customer Issue. Use d3-sankey (install it). Use the project color tokens. Insert the component into RIPModule between InventoryPosture and LowStockTable. If the Sankey is visually too busy at this data volume, fall back to a stacked bar chart with the same data and leave the Sankey commented for future use.

### 3.4.2 PowerPoint export hardening

> On a branch `feat/export-pptx`, harden the existing `exportPng` function in Header.tsx. Add (a) a loading state on the Export button while html-to-image runs, (b) a 1920×1080 export-only stylesheet that the export root applies during capture so fonts and spacing match the slide target regardless of viewport, (c) fallback handling if `toPng` rejects. Add a second button "Export Slide Deck" that uses pptxgenjs to create a one-slide .pptx file embedding the PNG. Install pptxgenjs.

### 3.4.3 Time range filtering — actually wire it

> On a branch `feat/time-range-filter`, the time range selector in Header currently passes a TimeRange prop to every module but most components ignore it. Wire it through. WorkloadWidget filters open work orders by induction date relative to the selected range. LaborComparison and SourceComparison sum across all months that fall in the range, not just the current month. IMATrends limits its 12-month sparklines to the selected range (e.g., "Trailing 90 Days" shows 3 points). Each component should re-derive metrics from the underlying seed entities using helpers in `src/data/derive.ts` — do not bypass derive.ts.

### 3.4.4 Drill-down: aging work order modal

> On a branch `feat/aging-drilldown`, replace the `<details>` expansion in WorkloadWidget with a proper modal dialog. Add a sort control (Days Open desc / asc, NSN, Status, Tech). Add a "Copy to clipboard" button that copies the table as TSV for paste into Excel. Use a portal-rendered Dialog component — no external library, hand-roll it with a backdrop and ESC-to-close. Style consistent with the rest of the app.

### 3.4.5 Visual polish pass

> On a branch `chore/visual-polish`, do a top-to-bottom pass against the design system in the build doc. Verify (a) every numeric value uses `font-variant-numeric: tabular-nums`, (b) no chart uses red or green as the sole encoding for status (add icons or labels where needed), (c) every chart has axis units in its labels, (d) target lines render on every chart that has a defined target, (e) the integrated view fits 1920×1080 with no scrolling and no chart smaller than legible at briefing-room distance. Take a screenshot of each module and the integrated view at 1920×1080 and attach to the PR.

## 3.5 Milestone tagging

After PR merges that complete a major increment, tag the release:

> Create a git tag on `main` named `v0.<n>-<milestone-name>` (e.g. `v0.1-scaffold-complete`, `v0.2-trends-and-filtering`, `v0.3-export-hardened`). Use an annotated tag with a message summarizing what's in this milestone. Push tags. Open a GitHub release with the same name, body lifted from the tag message.

## 3.6 Customer demo branch

When you're ready for a stakeholder walkthrough:

> Create a branch `demo/<customer>-<date>` from the latest tagged release. Update `src/data/seed.json` to the demo dataset (regenerate from `gen_seed.js` with seed=42 unless told otherwise). Update Header.tsx classification banner if the customer requires a different marking. Build a static production bundle (`npm run build`) and commit the `dist/` folder so the branch can be served directly without rebuild. Tag this branch as `demo-<customer>-<date>`. Do not merge to `main`.

---

# Appendix A — File tree at end of Part 2

```
commanders-dashboard/
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── types.ts
    ├── data/
    │   ├── seed.json              ← from the seed generator
    │   ├── loadSeed.ts
    │   └── derive.ts
    └── components/
        ├── shared/
        │   ├── Header.tsx
        │   ├── KPITile.tsx
        │   └── Sparkline.tsx
        ├── ima/
        │   ├── IMAModule.tsx
        │   ├── WorkloadWidget.tsx
        │   ├── LaborComparison.tsx
        │   └── IMATrends.tsx
        ├── rip/
        │   ├── RIPModule.tsx
        │   ├── InventoryPosture.tsx
        │   ├── LowStockTable.tsx
        │   ├── SourceComparison.tsx
        │   └── BudgetTracker.tsx
        └── integrated/
            ├── IntegratedView.tsx
            └── CalloutBar.tsx
```

# Appendix B — Out-of-scope reminders for the build

Do not implement, even if the seed data would support it:

- Authentication, role-based access, or any user management.
- Live integration with GCSS-MC, SASSY, MIMMS, or any production Marine Corps system.
- Mobile or tablet layouts. The dashboard targets 1440×900 minimum, 1920×1080 optimal.
- Editing of source data through the UI. The dashboard is fully read-only.
- Multi-unit aggregation. Single battalion only.
- Native PPTX file generation with editable chart elements (the export is a PNG; an optional PPTX wrapper that embeds the PNG is acceptable — see prompt 3.4.2).

If any of these come up in customer conversation, log them in a "Future Phase" section of the README and resist the urge to scope-creep into them.

# Appendix C — Decision questions the dashboard must answer

Acceptance gate: in a live walkthrough with the 1st Maintenance Battalion Commander, all seven of these questions must be answerable from the integrated view in under sixty seconds without scrolling.

1. What's in my repair queue right now, and what's been sitting longer than ninety days?
2. How is the battalion workforce performing this month compared to recent months?
3. Are my Marines or my contractors producing better outcomes?
4. How healthy is my SECREP inventory, and what am I about to run out of?
5. Where are my repairs coming from, and which source delivers the best value per dollar?
6. How is my operating budget executing against plan?
7. How much money did I save the Marine Corps this month through successful Code B repairs?
