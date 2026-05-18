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
