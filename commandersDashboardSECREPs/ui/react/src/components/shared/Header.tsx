import { Download } from "lucide-react";
import { seedData } from "../../data/loadSeed";
import type { ModuleView, TimeRange } from "../../types";

interface Props {
  moduleView: ModuleView;
  onModuleViewChange: (v: ModuleView) => void;
  timeRange: TimeRange;
  onTimeRangeChange: (r: TimeRange) => void;
}

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  current_month: "Current Month",
  last_30_days: "Last 30 Days",
  trailing_90_days: "Trailing 90 Days",
  trailing_12_months: "Trailing 12 Months",
  custom: "Custom",
};

const MODULE_LABELS: Record<ModuleView, string> = {
  integrated: "Integrated",
  ima_only: "IMA Only",
  rip_only: "RIP Only",
};

export default function Header({
  moduleView,
  onModuleViewChange,
  timeRange,
  onTimeRangeChange,
}: Props) {
  const { meta } = seedData;

  return (
    <header className="bg-navy text-white">
      {/* Classification banner */}
      <div className="bg-warning text-center text-xs font-semibold py-1 tracking-widest text-white">
        {meta.classification}
      </div>
      <div className="max-w-[1920px] mx-auto px-6 py-3 flex items-center justify-between">
        <div>
          <div className="text-sm uppercase tracking-wide opacity-80">
            Commanders Dashboard for SECREPs
          </div>
          <div className="text-xl font-semibold">{meta.unit}</div>
          <div className="text-xs opacity-70 num">As of {meta.as_of_date}</div>
        </div>

        <div className="flex items-center gap-3">
          {/* Module toggle */}
          <div className="bg-white/10 rounded-md p-1 flex text-sm">
            {(["integrated", "ima_only", "rip_only"] as ModuleView[]).map((v) => (
              <button
                key={v}
                onClick={() => onModuleViewChange(v)}
                className={`px-3 py-1.5 rounded ${
                  moduleView === v
                    ? "bg-white text-navy font-medium"
                    : "text-white/80 hover:text-white"
                }`}
              >
                {MODULE_LABELS[v]}
              </button>
            ))}
          </div>

          {/* Time range */}
          <select
            value={timeRange}
            onChange={(e) => onTimeRangeChange(e.target.value as TimeRange)}
            className="bg-white/10 text-white border border-white/20 rounded-md px-3 py-1.5 text-sm"
          >
            {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((r) => (
              <option key={r} value={r} className="text-navy">
                {TIME_RANGE_LABELS[r]}
              </option>
            ))}
          </select>

          {/* Export */}
          <button
            className="bg-scarlet hover:bg-scarlet/90 text-white px-3 py-1.5 rounded-md text-sm flex items-center gap-2"
            onClick={() => exportPng()}
          >
            <Download size={14} />
            Export
          </button>
        </div>
      </div>
    </header>
  );
}

async function exportPng() {
  const target = document.getElementById("integrated-view-export-root");
  if (!target) {
    alert("Export only available on Integrated view.");
    return;
  }
  const { toPng } = await import("html-to-image");
  const dataUrl = await toPng(target, { width: 1920, height: 1080, pixelRatio: 1 });
  const link = document.createElement("a");
  link.download = `commanders-dashboard-${new Date().toISOString().slice(0, 10)}.png`;
  link.href = dataUrl;
  link.click();
}
