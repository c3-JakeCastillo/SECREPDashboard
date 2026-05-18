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
