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
