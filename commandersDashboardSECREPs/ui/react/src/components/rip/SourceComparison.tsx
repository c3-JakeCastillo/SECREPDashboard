import { useMemo } from "react";
import { seedData } from "../../data/loadSeed";
import {
  aggregateSource,
  filterMonthlySeries,
  formatMoney,
  formatPct,
  timeRangeLabel,
} from "../../data/derive";
import type { TimeRange } from "../../types";


interface Props { timeRange: TimeRange }

export default function SourceComparison({ timeRange }: Props) {
  const months = useMemo(
    () => filterMonthlySeries(seedData.monthly_closures, timeRange),
    [timeRange]
  );

  // For current month, prefer the pre-computed summary (includes total_cost)
  const isCurrent = timeRange === "current_month" || timeRange === "last_30_days";
  const precomputed = seedData.repair_source_summary_current_month;

  const rows = useMemo(() => {
    if (isCurrent && precomputed) {
      return [
        { name: "IMA",         colorClass: "bg-scarlet",          ...precomputed.ima },
        { name: "Raytheon V2X", colorClass: "bg-contractor-blue", ...precomputed.v2x },
        { name: "LOGCOM",      colorClass: "bg-steel",            ...precomputed.logcom },
      ];
    }
    // Derive from monthly_closures for wider ranges (no total_cost available)
    return [
      { name: "IMA",          colorClass: "bg-scarlet",          total_cost: 0, ...aggregateSource(months, "marine") },
      { name: "Raytheon V2X", colorClass: "bg-contractor-blue",  total_cost: 0, ...aggregateSource(months, "v2x") },
      { name: "LOGCOM",       colorClass: "bg-steel",            total_cost: 0, ...aggregateSource(months, "logcom") },
    ];
  }, [isCurrent, precomputed, months]);

  if (rows.every((r) => r.count === 0)) return null;

  const bestValue = rows.reduce((best, r) => {
    const ratio = r.total_cost > 0
      ? r.cost_savings / r.total_cost
      : r.successes > 0 ? r.cost_savings / r.successes : 0;
    const bestRatio = best.total_cost > 0
      ? best.cost_savings / best.total_cost
      : best.successes > 0 ? best.cost_savings / best.successes : 0;
    return ratio > bestRatio ? r : best;
  }, rows[0]);

  return (
    <section className="card">
      <h3 className="text-base font-semibold text-navy mb-3">
        Repair Source Comparison ({timeRangeLabel(timeRange)})
      </h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-steel text-xs uppercase">
            <th className="py-2">Source</th>
            <th className="text-right">Repaired</th>
            <th className="text-right">Repair Rate</th>
            {isCurrent && <th className="text-right">Total Cost</th>}
            <th className="text-right">Cost Savings</th>
            <th className="text-right">Avg CWT (days)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-t border-slate-100">
              <td className="py-2">
                <span className={`${r.colorClass} text-white px-2 py-0.5 rounded text-xs font-semibold`}>
                  {r.name}
                </span>
              </td>
              <td className="text-right num">{r.successes} / {r.count}</td>
              <td className="text-right num">{formatPct(r.repair_rate * 100)}</td>
              {isCurrent && <td className="text-right num">{formatMoney(r.total_cost)}</td>}
              <td className="text-right num text-success font-semibold">{formatMoney(r.cost_savings)}</td>
              <td className="text-right num">{r.avg_cwt_days.toFixed(0)}d</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 text-sm text-success">
        <span className="font-semibold">Best value this period:</span> {bestValue.name}
        {bestValue.total_cost > 0 && (
          <> — ${(bestValue.cost_savings / bestValue.total_cost).toFixed(2)} saved per dollar obligated</>
        )}
      </div>
    </section>
  );
}
