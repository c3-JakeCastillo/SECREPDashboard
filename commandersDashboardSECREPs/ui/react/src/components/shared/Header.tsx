import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { seedData } from "../../data/loadSeed";
import type { ModuleView, TimeRange } from "../../types";

interface Props {
  moduleView: ModuleView;
  onModuleViewChange: (v: ModuleView) => void;
  timeRange: TimeRange;
  onTimeRangeChange: (r: TimeRange) => void;
}

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  current_month:      "Current Month",
  last_30_days:       "Last 30 Days",
  trailing_90_days:   "Trailing 90 Days",
  trailing_12_months: "Trailing 12 Months",
  custom:             "Custom",
};

const MODULE_LABELS: Record<ModuleView, string> = {
  integrated: "Integrated",
  ima_only:   "IMA Only",
  rip_only:   "RIP Only",
};

export default function Header({
  moduleView,
  onModuleViewChange,
  timeRange,
  onTimeRangeChange,
}: Props) {
  const { meta } = seedData;
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: "png" | "pptx") => {
    const target = document.getElementById("integrated-view-export-root");
    if (!target) {
      alert("Switch to Integrated view before exporting.");
      return;
    }
    setExporting(true);
    try {
      await runExport(target, format, meta.as_of_date);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Export failed:", err);
      alert("Export failed — see console for details.");
    } finally {
      setExporting(false);
    }
  };

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

          {/* Export PNG */}
          <button
            disabled={exporting}
            className="bg-scarlet hover:bg-scarlet/90 disabled:opacity-60 text-white px-3 py-1.5 rounded-md text-sm flex items-center gap-2"
            onClick={() => handleExport("png")}
          >
            {exporting
              ? <Loader2 size={14} className="animate-spin" />
              : <Download size={14} />}
            {exporting ? "Exporting…" : "Export PNG"}
          </button>

          {/* Export PPTX */}
          <button
            disabled={exporting}
            className="bg-white/10 hover:bg-white/20 disabled:opacity-60 text-white border border-white/20 px-3 py-1.5 rounded-md text-sm flex items-center gap-2"
            onClick={() => handleExport("pptx")}
          >
            <Download size={14} />
            Export Slide
          </button>
        </div>
      </div>
    </header>
  );
}

async function captureSlide(target: HTMLElement, asOfDate: string): Promise<string> {
  // Apply export-only styles: force 1920px wide, white bg, hide scrollbars
  const prev = {
    width:    target.style.width,
    maxWidth: target.style.maxWidth,
    overflow: target.style.overflow,
  };
  target.style.width    = "1920px";
  target.style.maxWidth = "1920px";
  target.style.overflow = "visible";

  try {
    const { toPng } = await import("html-to-image");
    return await toPng(target, {
      width:      1920,
      height:     1080,
      pixelRatio: 1,
      backgroundColor: "#F7F8FA",
      style: { fontFamily: "Inter, system-ui, sans-serif" },
    });
  } finally {
    target.style.width    = prev.width;
    target.style.maxWidth = prev.maxWidth;
    target.style.overflow = prev.overflow;
    void asOfDate; // used in filename by callers
  }
}

async function runExport(target: HTMLElement, format: "png" | "pptx", asOfDate: string) {
  const dataUrl = await captureSlide(target, asOfDate);
  const filename = `commanders-dashboard-${asOfDate}`;

  if (format === "png") {
    const link = document.createElement("a");
    link.download = `${filename}.png`;
    link.href = dataUrl;
    link.click();
    return;
  }

  // PPTX — embed the PNG in a 13.33" × 7.5" slide (standard 16:9)
  const PptxGenJs = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJs();
  pptx.layout = "LAYOUT_WIDE";

  const slide = pptx.addSlide();
  slide.addImage({
    data:   dataUrl,
    x: 0, y: 0,
    w: "100%", h: "100%",
  });

  await pptx.writeFile({ fileName: `${filename}.pptx` });
}
