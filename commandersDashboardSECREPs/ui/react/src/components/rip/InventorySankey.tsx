import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
} from "recharts";
import { seedData } from "../../data/loadSeed";
import {
  aggregateInventoryFlow,
  filterMonthlySeries,
  timeRangeLabel,
} from "../../data/derive";
import type { TimeRange } from "../../types";

interface Props { timeRange: TimeRange }

// Color map per flow source
const COLORS: Record<string, string> = {
  "Straight Buy":    "#1F4E79",
  "MRP Credit":      "#2E7D9A",
  "Initial Issue":   "#5C9BBF",
  "IMA Repair ✓":   "#1F7A4D",
  "IMA Washout ✗":  "#B3261E",
  "V2X Repair ✓":   "#4A7C59",
  "V2X Washout ✗":  "#C74F4A",
  "LOGCOM Repair ✓": "#6DAA7F",
  "LOGCOM Washout ✗": "#D4736F",
  "Unit Turn-in":    "#8E6B3A",
};

const ISSUE_COLOR = "#0B2545";

export default function InventorySankey({ timeRange }: Props) {
  const flow = useMemo(() => {
    const months = filterMonthlySeries(seedData.monthly_inventory_flow, timeRange);
    return months.length > 0
      ? aggregateInventoryFlow(months)
      : aggregateInventoryFlow(seedData.monthly_inventory_flow.filter((m) => m.months_ago === 0));
  }, [timeRange]);

  // Build inbound rows (all sources that add serviceable/unserviceable stock)
  const inboundRows = [
    { label: "Straight Buy",    qty: flow.straight_buy_serv,     type: "in" },
    { label: "MRP Credit",      qty: flow.mrp_credit_serv,       type: "in" },
    { label: "Initial Issue",   qty: flow.initial_issue_serv,    type: "in" },
    { label: "IMA Repair ✓",   qty: flow.ima_repair_serv,       type: "in" },
    { label: "IMA Washout ✗",  qty: flow.ima_repair_washout,    type: "washout" },
    { label: "V2X Repair ✓",   qty: flow.v2x_repair_serv,       type: "in" },
    { label: "V2X Washout ✗",  qty: flow.v2x_repair_washout,    type: "washout" },
    { label: "LOGCOM Repair ✓", qty: flow.logcom_repair_serv,    type: "in" },
    { label: "LOGCOM Washout ✗", qty: flow.logcom_repair_washout, type: "washout" },
    { label: "Unit Turn-in",    qty: flow.unit_turnin_unserv,    type: "in" },
  ].filter((r) => r.qty > 0);

  const totalIn   = inboundRows.reduce((s, r) => s + r.qty, 0);
  const totalOut  = flow.customer_issue_serv;

  return (
    <section className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-navy">
          Inventory Flow — {timeRangeLabel(timeRange)}
        </h3>
        <div className="flex gap-4 text-xs text-steel num">
          <span>
            Total In: <span className="font-semibold text-navy">{totalIn.toLocaleString()}</span> units
          </span>
          <span>
            Customer Issues: <span className="font-semibold text-navy">{totalOut.toLocaleString()}</span> units
          </span>
        </div>
      </div>

      {/* Two side-by-side bar charts: Inbound sources | Customer Issues */}
      <div className="grid grid-cols-3 gap-6 items-end">
        {/* Inbound */}
        <div className="col-span-2">
          <div className="text-xs uppercase tracking-wide text-steel mb-2">Inbound Sources</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={inboundRows}
              layout="vertical"
              margin={{ top: 0, right: 60, left: 4, bottom: 0 }}
            >
              <XAxis type="number" tick={{ fontSize: 10, fill: "#5C6B73" }} />
              <YAxis
                type="category"
                dataKey="label"
                width={130}
                tick={{ fontSize: 11, fill: "#0B2545" }}
              />
              <Tooltip
                formatter={(v: number) => [`${v} units`, "Qty"]}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="qty" radius={[0, 3, 3, 0]}>
                {inboundRows.map((row) => (
                  <Cell key={row.label} fill={COLORS[row.label] ?? "#5C6B73"} />
                ))}
                <LabelList
                  dataKey="qty"
                  position="right"
                  style={{ fontSize: 11, fill: "#0B2545", fontVariantNumeric: "tabular-nums" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Outbound */}
        <div>
          <div className="text-xs uppercase tracking-wide text-steel mb-2">Customer Issues</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={[{ label: "Issues Out", qty: totalOut }]}
              layout="vertical"
              margin={{ top: 0, right: 60, left: 4, bottom: 0 }}
            >
              <XAxis type="number" domain={[0, Math.max(totalIn, totalOut)]} tick={{ fontSize: 10, fill: "#5C6B73" }} />
              <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 11, fill: "#0B2545" }} />
              <Tooltip
                formatter={(v: number) => [`${v} units`, "Qty"]}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="qty" fill={ISSUE_COLOR} radius={[0, 3, 3, 0]}>
                <LabelList
                  dataKey="qty"
                  position="right"
                  style={{ fontSize: 11, fill: "#0B2545", fontVariantNumeric: "tabular-nums" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3">
        {[
          { color: "#1F4E79", label: "Procurement" },
          { color: "#1F7A4D", label: "Repair success (Code B)" },
          { color: "#B3261E", label: "Washout (Code F WIR)" },
          { color: "#8E6B3A", label: "Unit turn-in (unserviceable)" },
          { color: "#0B2545", label: "Customer issue" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-steel">
            <span className="w-3 h-3 rounded-sm inline-block shrink-0" style={{ backgroundColor: color }} />
            {label}
          </div>
        ))}
      </div>
    </section>
  );
}
