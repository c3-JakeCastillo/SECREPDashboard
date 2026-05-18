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
      <h3 className="text-base font-semibold text-navy mb-3">Budget Execution — {b.fiscal_year}</h3>
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
          <Line type="monotone" dataKey="ideal" stroke="#5C6B73" strokeDasharray="4 4" dot={false} name="Ideal burn" />
          <Line type="monotone" dataKey="received" stroke="#1F7A4D" strokeWidth={2} dot={false} name="Received ($)" />
          <Line type="monotone" dataKey="obligated" stroke="#8E2932" strokeWidth={2} dot={false} name="Obligated ($)" />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
