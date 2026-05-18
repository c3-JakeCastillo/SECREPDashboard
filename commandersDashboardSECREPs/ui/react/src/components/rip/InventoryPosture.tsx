import { seedData } from "../../data/loadSeed";
import { formatPct } from "../../data/derive";
import type { TimeRange } from "../../types";

interface Props { timeRange: TimeRange }

export default function InventoryPosture(_props: Props) {
  const h = seedData.inventory_health;
  const total = h.total_allowance;
  const serv = h.total_serviceable;
  const unserv = h.total_unserviceable;
  const onOrder = h.total_on_order;
  const gap = Math.max(0, total - (serv + unserv + onOrder));

  const segments = [
    { label: "Serviceable", qty: serv, colorClass: "bg-success" },
    { label: "Unserviceable", qty: unserv, colorClass: "bg-warning" },
    { label: "On Order", qty: onOrder, colorClass: "bg-steel" },
    { label: "Gap", qty: gap, colorClass: "bg-critical/40" },
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
              className={`${s.colorClass} flex items-center justify-center text-white text-xs`}
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
              <span className={`${s.colorClass} w-3 h-3 rounded`} />
              <span className="kpi-label">{s.label}</span>
            </div>
            <div className="kpi-value">{s.qty.toLocaleString()}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
