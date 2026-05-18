import { seedData } from "../../data/loadSeed";
import { formatMoney, formatPct } from "../../data/derive";
import type { TimeRange } from "../../types";

interface Props { timeRange: TimeRange }

export default function SourceComparison({ timeRange }: Props) {
  void timeRange; // will be wired in time-range filter pass
  const summary = seedData.repair_source_summary_current_month;
  if (!summary) return null;

  const rows = [
    { name: "IMA", colorClass: "bg-scarlet", ...summary.ima },
    { name: "Raytheon V2X", colorClass: "bg-contractor-blue", ...summary.v2x },
    { name: "LOGCOM", colorClass: "bg-steel", ...summary.logcom },
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
              <td className="text-right num">{formatMoney(r.total_cost)}</td>
              <td className="text-right num text-success font-semibold">{formatMoney(r.cost_savings)}</td>
              <td className="text-right num">{r.avg_cwt_days.toFixed(0)}d</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 text-sm text-success">
        <span className="font-semibold">Best value this period:</span> {bestValue.name} —{" "}
        ${(bestValue.cost_savings / Math.max(bestValue.total_cost, 1)).toFixed(2)} saved per dollar obligated
      </div>
    </section>
  );
}
