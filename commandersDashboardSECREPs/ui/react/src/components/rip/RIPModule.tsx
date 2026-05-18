import { seedData } from "../../data/loadSeed";
import { formatMoney, formatPct } from "../../data/derive";
import KPITile from "../shared/KPITile";
import InventoryPosture from "./InventoryPosture";
import LowStockTable from "./LowStockTable";
import SourceComparison from "./SourceComparison";
import BudgetTracker from "./BudgetTracker";
import type { TimeRange } from "../../types";

interface Props { timeRange: TimeRange }

export default function RIPModule({ timeRange }: Props) {
  const { kpi_snapshot } = seedData;
  const rip = kpi_snapshot.rip;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-4 gap-4">
        <KPITile
          label="Inventory Health"
          value={formatPct(rip.inventory_health_pct)}
          sub="Serviceable / total on hand"
          status={rip.inventory_health_pct >= 85 ? "ok" : "watch"}
        />
        <KPITile
          label="Stockout Items"
          value={rip.zero_stock_count.toString()}
          sub={`${rip.low_stock_count} additional low-stock`}
          status={rip.zero_stock_count > 0 ? "critical" : "ok"}
        />
        <KPITile
          label="Budget Obligated"
          value={formatPct(rip.budget_obligated_pct)}
          sub="of FY26 planned"
          status={rip.budget_obligated_pct <= 90 ? "ok" : "watch"}
        />
        <KPITile
          label="Budget Shortfall"
          value={formatMoney(rip.budget_shortfall)}
          sub="Mostly 3PL contracts"
          status={rip.budget_shortfall > 500_000 ? "critical" : "ok"}
        />
      </section>

      <InventoryPosture timeRange={timeRange} />
      <LowStockTable />
      <SourceComparison timeRange={timeRange} />
      <BudgetTracker />
    </div>
  );
}
