import { useMemo } from "react";
import { seedData } from "../../data/loadSeed";
import {
  aggregateSource,
  filterMonthlySeries,
  formatMoney,
  formatPct,
  formatDays,
  timeRangeLabel,
} from "../../data/derive";
import type { TimeRange } from "../../types";

interface Props { timeRange: TimeRange }

export default function LaborComparison({ timeRange }: Props) {
  const months = useMemo(
    () => filterMonthlySeries(seedData.monthly_closures, timeRange),
    [timeRange]
  );

  const marine = useMemo(() => aggregateSource(months, "marine"), [months]);
  const v2x    = useMemo(() => aggregateSource(months, "v2x"),    [months]);

  if (months.length === 0) return (
    <section className="card">
      <p className="text-sm text-steel">No closure data for selected range.</p>
    </section>
  );

  return (
    <section className="card">
      <h3 className="text-base font-semibold text-navy mb-3">
        Labor Performance — Marine vs. Contracted ({timeRangeLabel(timeRange)})
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
  const accentClass = color === "scarlet"
    ? "bg-scarlet text-white"
    : "bg-contractor-blue text-white";

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className={`${accentClass} px-4 py-2 font-semibold text-sm`}>
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
