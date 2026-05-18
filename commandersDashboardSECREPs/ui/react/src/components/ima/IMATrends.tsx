import { seedData } from "../../data/loadSeed";
import { chronological, formatMoney } from "../../data/derive";
import Sparkline from "../shared/Sparkline";
import type { TimeRange } from "../../types";

interface Props { timeRange: TimeRange }

export default function IMATrends({ timeRange: _ }: Props) {
  const series = chronological(seedData.monthly_closures);
  const labels = series.map((m) => m.month.slice(2));

  const closuresData = series.map((m, i) => ({ label: labels[i], value: m.total_closed }));
  const marineRateData = series.map((m, i) => ({ label: labels[i], value: m.marine.repair_rate * 100 }));
  const v2xRateData = series.map((m, i) => ({ label: labels[i], value: m.v2x.repair_rate * 100 }));
  const savingsData = series.map((m, i) => ({
    label: labels[i],
    value: m.marine.cost_savings + m.v2x.cost_savings + m.logcom.cost_savings,
  }));

  return (
    <section className="card">
      <h3 className="text-base font-semibold text-navy mb-3">12-Month Trends</h3>
      <div className="grid grid-cols-4 gap-4">
        <TrendBox label="Closures / Month" data={closuresData} color="#0B2545" />
        <TrendBox label="Marine Repair Rate (%)" data={marineRateData} color="#8E2932" subFormat="pct" />
        <TrendBox label="V2X Repair Rate (%)" data={v2xRateData} color="#1F4E79" subFormat="pct" />
        <TrendBox label="Total Cost Savings" data={savingsData} color="#1F7A4D" subFormat="money" />
      </div>
    </section>
  );
}

function TrendBox({
  label,
  data,
  color,
  subFormat,
}: {
  label: string;
  data: { label: string; value: number }[];
  color: string;
  subFormat?: "pct" | "money";
}) {
  const latest = data[data.length - 1]?.value ?? 0;
  const formatted =
    subFormat === "pct" ? `${latest.toFixed(1)}%`
    : subFormat === "money" ? formatMoney(latest)
    : latest.toFixed(0);
  return (
    <div>
      <div className="kpi-label">{label}</div>
      <div className="text-lg font-semibold text-navy num">{formatted}</div>
      <div className="mt-2"><Sparkline data={data} color={color} height={40} /></div>
    </div>
  );
}
