import clsx from "clsx";

interface Props {
  label: string;
  value: string;
  sub?: string;
  status?: "ok" | "watch" | "critical" | "neutral";
  target?: string;
}

export default function KPITile({ label, value, sub, status = "neutral", target }: Props) {
  const accentBar = clsx(
    "h-1 w-full rounded-t-lg",
    status === "ok" && "bg-success",
    status === "watch" && "bg-warning",
    status === "critical" && "bg-critical",
    status === "neutral" && "bg-steel/30"
  );

  const valueColor = clsx(
    status === "critical" && "text-critical",
    status === "watch" && "text-warning",
    (status === "ok" || status === "neutral") && "text-navy"
  );

  return (
    <div className="card !p-0 overflow-hidden">
      <div className={accentBar} />
      <div className="p-4">
        <div className="kpi-label">{label}</div>
        <div className={clsx("kpi-value", valueColor)}>{value}</div>
        {sub && <div className="kpi-sub">{sub}</div>}
        {target && (
          <div className="text-xs text-steel/80 mt-1 num">Target: {target}</div>
        )}
      </div>
    </div>
  );
}
