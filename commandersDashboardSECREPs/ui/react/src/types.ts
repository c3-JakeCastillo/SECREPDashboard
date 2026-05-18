// === Core entities ===

export type WorkOrderStatus =
  | "Inducted"
  | "InWork"
  | "AwaitingParts"
  | "AwaitingQA"
  | "ReadyForReturn"
  | "Closed";

export type LaborType = "Marine" | "Contracted";
export type Outcome = "CodeB_Success" | "CodeF_WIR" | null;
export type RepairSource = "IMA" | "V2X" | "LOGCOM";

export interface ServiceRequest {
  id: string;
  nsn: string;
  nomenclature: string;
  status: WorkOrderStatus;
  induction_date: string;          // ISO YYYY-MM-DD
  close_date: string | null;
  labor_type: LaborType;
  outcome: Outcome;
  replacement_cost: number;
  assigned_tech: string;
  repair_source: RepairSource;
}

export interface InventoryItem {
  nsn: string;
  nomenclature: string;
  allowance_qty: number;
  on_hand_serviceable: number;
  on_hand_unserviceable: number;
  on_order_qty: number;
  on_order_eta: string | null;
  reorder_point: number;
  unit_replacement_cost: number;
  _note?: string;                  // Suggested action for low-stock callout
}

export interface RepairJob {
  service_request_id: string;
  repair_source: RepairSource;
  cost: number;
  cost_savings: number;
  outcome: Outcome;
  close_date: string;
}

export interface MonthlySourcePerformance {
  count: number;
  successes: number;
  repair_rate: number;             // 0-1
  avg_cwt_days: number;
  cost_savings: number;
}

export interface MonthlyClosures {
  month: string;                   // "YYYY-MM"
  months_ago: number;
  total_closed: number;
  marine: MonthlySourcePerformance;
  v2x: MonthlySourcePerformance;
  logcom: MonthlySourcePerformance;
}

export interface MonthlyInventoryFlow {
  month: string;
  months_ago: number;
  straight_buy_serv: number;
  mrp_credit_serv: number;
  initial_issue_serv: number;
  ima_repair_serv: number;
  ima_repair_washout: number;
  v2x_repair_serv: number;
  v2x_repair_washout: number;
  logcom_repair_serv: number;
  logcom_repair_washout: number;
  unit_turnin_unserv: number;
  customer_issue_serv: number;
}

export interface BudgetLedger {
  fiscal_year: string;
  fy_start_date: string;
  fy_end_date: string;
  planned_allocation: number;
  received_to_date: number;
  total_obligated: number;
  obligations_by_category: {
    straight_buy: number;
    mrp: number;
    three_pl_v2x: number;
    logcom: number;
  };
  shortfall_by_category: {
    straight_buy: number;
    mrp: number;
    three_pl_v2x: number;
    logcom: number;
  };
  total_shortfall: number;
  pct_received: number;
  pct_obligated: number;
  cumulative_obligation_by_month: { fy_month: string; cumulative: number }[];
  cumulative_receipt_by_month: { fy_month: string; cumulative: number }[];
}

export interface KpiSnapshot {
  as_of: string;
  ima: {
    open_work_orders: number;
    aging_over_90_days: number;
    repair_rate_pct_current_month: number;
    avg_customer_wait_time_days_current_month: number;
    cost_savings_current_month: number;
  };
  rip: {
    inventory_health_pct: number;
    allowance_fulfillment_pct: number;
    zero_stock_count: number;
    low_stock_count: number;
    budget_obligated_pct: number;
    budget_shortfall: number;
  };
}

export interface AgingItem {
  id: string;
  nsn: string;
  nomenclature: string;
  days_open: number;
  status: WorkOrderStatus;
  assigned_tech: string;
  labor_type: LaborType;
}

export interface InventoryHealth {
  total_serviceable: number;
  total_unserviceable: number;
  total_on_order: number;
  total_allowance: number;
  zero_stock_count: number;
  low_stock_count: number;
  health_pct: number;
  allowance_fulfillment_pct: number;
}

// === Root seed shape ===

export interface SeedData {
  meta: {
    generated_at: string;
    unit: string;
    classification: string;
    as_of_date: string;
    fiscal_year: string;
    description: string;
    seeded_anomalies: string[];
  };
  kpi_snapshot: KpiSnapshot;
  commander_callout: string;
  service_requests: ServiceRequest[];
  open_work_orders_summary: {
    total: number;
    by_status: Record<WorkOrderStatus, number>;
    aging_over_90_days: number;
    aging_items: AgingItem[];
  };
  inventory_items: InventoryItem[];
  inventory_health: InventoryHealth;
  low_and_zero_stock_items: InventoryItem[];
  inventory_transactions: {
    month: string;
    source: string;
    qty: number;
    condition: "Serviceable" | "Unserviceable";
    direction: "In" | "Out";
  }[];
  monthly_inventory_flow: MonthlyInventoryFlow[];
  repair_jobs: RepairJob[];
  monthly_closures: MonthlyClosures[];
  budget_ledger: BudgetLedger;
  repair_source_summary_current_month: {
    ima: MonthlySourcePerformance & { total_cost: number };
    v2x: MonthlySourcePerformance & { total_cost: number };
    logcom: MonthlySourcePerformance & { total_cost: number };
  } | null;
}

// === UI state ===

export type TimeRange =
  | "current_month"
  | "last_30_days"
  | "trailing_90_days"
  | "trailing_12_months"
  | "custom";

export type ModuleView = "integrated" | "ima_only" | "rip_only";
