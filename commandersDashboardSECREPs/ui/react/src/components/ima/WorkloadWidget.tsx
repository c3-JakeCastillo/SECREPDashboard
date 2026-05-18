import { useMemo } from "react";
import { seedData } from "../../data/loadSeed";
import { AlertTriangle } from "lucide-react";
import type { TimeRange } from "../../types";

interface Props { timeRange: TimeRange }

/** Returns the cutoff date for a TimeRange relative to the seed's as_of_date. */
function getCutoff(range: TimeRange, asOf: string): Date | null {
  const anchor = new Date(asOf);
  switch (range) {
    case "current_month":
      return new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    case "last_30_days":
      return new Date(anchor.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "trailing_90_days":
      return new Date(anchor.getTime() - 90 * 24 * 60 * 60 * 1000);
    case "trailing_12_months":
      return new Date(anchor.getTime() - 365 * 24 * 60 * 60 * 1000);
    case "custom":
      return null; // no cutoff — show all open WOs
  }
}

export default function WorkloadWidget({ timeRange }: Props) {
  const { open_work_orders_summary, service_requests, meta } = seedData;

  // For non-current ranges, re-derive open WO counts from service_requests
  const filteredSummary = useMemo(() => {
    const cutoff = getCutoff(timeRange, meta.as_of_date);
    if (!cutoff) return open_work_orders_summary;

    const openWOs = service_requests.filter(
      (sr) => sr.close_date === null && new Date(sr.induction_date) >= cutoff
    );

    const byStatus = openWOs.reduce((acc, sr) => {
      acc[sr.status] = (acc[sr.status] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: openWOs.length,
      by_status: byStatus,
      aging_over_90_days: open_work_orders_summary.aging_over_90_days,
      aging_items: open_work_orders_summary.aging_items,
    };
  }, [timeRange, service_requests, meta.as_of_date, open_work_orders_summary]);

  const summary = filteredSummary;

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
