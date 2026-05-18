#!/usr/bin/env node
/**
 * Seed data generator for Commanders Dashboard for SECREPs
 *
 * Produces 12 months of synthetic Marine Corps maintenance battalion activity,
 * sized and shaped for the integrated commander's dashboard demo.
 *
 * USAGE
 *   node gen_seed.js                              # default scenario, writes seed.json
 *   node gen_seed.js --scenario healthy           # named preset
 *   node gen_seed.js --scenario crisis            # named preset
 *   node gen_seed.js --scenario fy-pinch          # named preset
 *   node gen_seed.js --scenario baseline          # named preset (= default)
 *   node gen_seed.js --seed 99 --out custom.json  # custom random seed + output path
 *   node gen_seed.js --unit "2d Maint Bn" \
 *                    --as-of 2026-08-15 \
 *                    --planned-budget 16000000   # per-customer overrides
 *   node gen_seed.js --help                       # print full flag list
 *
 * NAMED SCENARIOS
 *   baseline  — default demo dataset (3 zero-stock items, 85% obligated, V2X dip)
 *   healthy   — everything green: no aging WOs, no stockouts, budget on plan
 *   crisis    — multiple stockouts, V2X collapse, significant budget shortfall
 *   fy-pinch  — clean operations but 95% obligated with 4 months left in FY
 *
 * All scenarios are deterministic given a fixed --seed. Default seed is 42.
 * Default unit is 1st Maintenance Battalion, 1st Marine Logistics Group.
 */

const fs = require('fs');
const path = require('path');

// ===========================================================================
// CLI ARGUMENT PARSING
// ===========================================================================

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') { args.help = true; continue; }
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    }
  }
  return args;
}

function printHelpAndExit() {
  console.log(`
Commanders Dashboard for SECREPs — seed data generator

USAGE
  node gen_seed.js [options]

OPTIONS
  --scenario <name>         Named scenario preset:
                              baseline (default) | healthy | crisis | fy-pinch
  --seed <int>              Random seed (default: 42)
  --out <path>              Output file path (default: ./seed.json)
  --unit <string>           Unit name for the header
                              (default: "1st Maintenance Battalion, 1st Marine Logistics Group")
  --as-of <YYYY-MM-DD>      Anchor date for "today" (default: 2026-05-18)
  --fiscal-year <YYYY>      Fiscal year label (default: FY2026)
  --planned-budget <int>    Total planned FY allocation in USD (default: 14500000)
  --classification <str>    Classification banner text (default: "UNCLASSIFIED // FOUO")
  --num-inventory <int>     Number of SECREP inventory lines (default: 400)
  --num-open-wo <int>       Number of currently open service requests (default: 150)
  --help, -h                Print this message

EXAMPLES
  # Default demo dataset
  node gen_seed.js

  # Crisis scenario for an executive briefing
  node gen_seed.js --scenario crisis --out crisis_demo.json

  # 2d Maint Bn variant
  node gen_seed.js --unit "2d Maintenance Battalion" --out seed_2dmb.json

  # Different fiscal year anchor
  node gen_seed.js --as-of 2027-02-01 --fiscal-year FY2027
`);
  process.exit(0);
}

const cli = parseArgs(process.argv.slice(2));
if (cli.help) printHelpAndExit();

// ===========================================================================
// SCENARIO PRESETS
// ===========================================================================

const SCENARIOS = {
  baseline: {
    description: "Default demo dataset; mild challenges, strong narrative hooks.",
    pct_healthy_inventory: 0.90,
    pct_low_inventory: 0.095,
    pct_zero_inventory: 0.005,
    num_seeded_zero_stock: 2,
    target_pct_obligated_at_anchor: 0.85,
    target_pct_received_at_anchor: 0.745,
    three_pl_shortfall_target: 850_000,
    v2x_dip_month: 9,
    v2x_dip_repair_rate: 0.71,
    marine_surge_month: 11,
    aging_skew_tail_pct: 0.06,
    repair_rate_targets: { marine: 0.88, v2x: 0.82, logcom: 0.79 },
    cwt_targets_days: { marine: 28, v2x: 35, logcom: 52 },
  },
  healthy: {
    description: "Everything green. Budget on plan, no stockouts, no aging WOs.",
    pct_healthy_inventory: 0.985,
    pct_low_inventory: 0.015,
    pct_zero_inventory: 0.0,
    num_seeded_zero_stock: 0,
    target_pct_obligated_at_anchor: 0.65,
    target_pct_received_at_anchor: 0.68,
    three_pl_shortfall_target: 80_000,
    v2x_dip_month: -1,
    v2x_dip_repair_rate: null,
    marine_surge_month: -1,
    aging_skew_tail_pct: 0.0,
    repair_rate_targets: { marine: 0.92, v2x: 0.88, logcom: 0.85 },
    cwt_targets_days: { marine: 22, v2x: 28, logcom: 42 },
  },
  crisis: {
    description: "Multiple stockouts, V2X collapse, deep budget shortfall.",
    pct_healthy_inventory: 0.72,
    pct_low_inventory: 0.22,
    pct_zero_inventory: 0.06,
    num_seeded_zero_stock: 5,
    target_pct_obligated_at_anchor: 0.93,
    target_pct_received_at_anchor: 0.70,
    three_pl_shortfall_target: 2_400_000,
    v2x_dip_month: 0,
    v2x_dip_repair_rate: 0.58,
    marine_surge_month: -1,
    aging_skew_tail_pct: 0.14,
    repair_rate_targets: { marine: 0.83, v2x: 0.62, logcom: 0.74 },
    cwt_targets_days: { marine: 34, v2x: 51, logcom: 62 },
  },
  "fy-pinch": {
    description: "Clean ops, but 95% obligated with 4 months of FY remaining.",
    pct_healthy_inventory: 0.92,
    pct_low_inventory: 0.075,
    pct_zero_inventory: 0.005,
    num_seeded_zero_stock: 1,
    target_pct_obligated_at_anchor: 0.95,
    target_pct_received_at_anchor: 0.72,
    three_pl_shortfall_target: 1_100_000,
    v2x_dip_month: -1,
    v2x_dip_repair_rate: null,
    marine_surge_month: 4,
    aging_skew_tail_pct: 0.04,
    repair_rate_targets: { marine: 0.89, v2x: 0.84, logcom: 0.80 },
    cwt_targets_days: { marine: 26, v2x: 32, logcom: 49 },
  },
};

const scenarioName = cli.scenario || 'baseline';
if (!SCENARIOS[scenarioName]) {
  console.error(`Unknown scenario "${scenarioName}". Known: ${Object.keys(SCENARIOS).join(', ')}`);
  process.exit(1);
}

// ===========================================================================
// CONFIG
// ===========================================================================

const SCENARIO = SCENARIOS[scenarioName];

const CONFIG = {
  scenario: scenarioName,
  scenarioDescription: SCENARIO.description,
  seed: cli.seed !== undefined ? parseInt(cli.seed, 10) : 42,
  outputPath: cli.out || './seed.json',
  unit: cli.unit || '1st Maintenance Battalion, 1st Marine Logistics Group',
  classification: cli.classification || 'UNCLASSIFIED // FOUO',
  asOfDate: cli['as-of'] || '2026-05-18',
  fiscalYear: cli['fiscal-year'] || 'FY2026',
  plannedBudget: cli['planned-budget']
    ? parseInt(cli['planned-budget'], 10)
    : 14_500_000,
  numInventory: cli['num-inventory'] ? parseInt(cli['num-inventory'], 10) : 400,
  numOpenWO: cli['num-open-wo'] ? parseInt(cli['num-open-wo'], 10) : 150,
  ...SCENARIO,
};

// ===========================================================================
// DETERMINISTIC PRNG
// ===========================================================================

let seedState = CONFIG.seed;
function rand() {
  seedState = (seedState * 9301 + 49297) % 233280;
  return seedState / 233280;
}
function randInt(min, max) { return Math.floor(rand() * (max - min + 1)) + min; }
function randChoice(arr) { return arr[Math.floor(rand() * arr.length)]; }
function randNormal(mean, stdev) {
  const u = rand() || 0.0001;
  const v = rand() || 0.0001;
  return mean + stdev * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ===========================================================================
// REFERENCE CATALOGS
// ===========================================================================

const SECREP_CATALOG = [
  { nomenclature: "Transmission Assembly, AAV-7A1", basePrice: 48500 },
  { nomenclature: "Engine Assembly, HMMWV M1151", basePrice: 22800 },
  { nomenclature: "Hydraulic Pump, MTVR MK23", basePrice: 8400 },
  { nomenclature: "Alternator, 200A 28VDC", basePrice: 1850 },
  { nomenclature: "Starter Motor, Diesel", basePrice: 2200 },
  { nomenclature: "Turbocharger, 7.2L Diesel", basePrice: 6900 },
  { nomenclature: "Differential Assembly, Front", basePrice: 14200 },
  { nomenclature: "Differential Assembly, Rear", basePrice: 14800 },
  { nomenclature: "Transfer Case, MTVR", basePrice: 18600 },
  { nomenclature: "Radio Set, AN/PRC-117G", basePrice: 12500 },
  { nomenclature: "Radio Set, AN/PRC-152A", basePrice: 7800 },
  { nomenclature: "Antenna Group, AS-3683", basePrice: 3200 },
  { nomenclature: "Power Supply Unit, COMSEC", basePrice: 1450 },
  { nomenclature: "GPS Receiver, DAGR", basePrice: 4100 },
  { nomenclature: "Night Vision Goggles, AN/PVS-31", basePrice: 13200 },
  { nomenclature: "Thermal Sight, AN/PAS-13G", basePrice: 9800 },
  { nomenclature: "Laser Range Finder, AN/PEQ-1A", basePrice: 11500 },
  { nomenclature: "Generator Set, 5kW MEP-802A", basePrice: 16400 },
  { nomenclature: "Generator Set, 10kW MEP-803A", basePrice: 24300 },
  { nomenclature: "Air Conditioner, ECU 18000 BTU", basePrice: 4600 },
  { nomenclature: "Water Purification Unit, ROWPU", basePrice: 28900 },
  { nomenclature: "Fuel Pump Assembly, Diesel", basePrice: 1320 },
  { nomenclature: "Brake Caliper Assembly", basePrice: 880 },
  { nomenclature: "Steering Gear Assembly", basePrice: 4750 },
  { nomenclature: "Suspension Arm, Upper", basePrice: 1100 },
  { nomenclature: "Suspension Arm, Lower", basePrice: 1250 },
  { nomenclature: "Drive Shaft Assembly", basePrice: 3400 },
  { nomenclature: "Cooling Fan Clutch", basePrice: 720 },
  { nomenclature: "Radiator Assembly, MTVR", basePrice: 2900 },
  { nomenclature: "Air Compressor, Brake System", basePrice: 1680 },
  { nomenclature: "Winch Assembly, 10K LB", basePrice: 5400 },
  { nomenclature: "Hydraulic Cylinder, Lift", basePrice: 2150 },
  { nomenclature: "Control Valve Assembly, Hydraulic", basePrice: 1850 },
  { nomenclature: "Electronic Control Unit, Engine", basePrice: 3800 },
  { nomenclature: "Wiring Harness, Main", basePrice: 1450 },
  { nomenclature: "Battery, 12V 6TL", basePrice: 320 },
  { nomenclature: ".50 Cal MG, M2A1 Bolt Group", basePrice: 4200 },
  { nomenclature: "M240B Barrel Assembly", basePrice: 2800 },
  { nomenclature: "Mortar Sight, M67", basePrice: 1900 },
  { nomenclature: "Tripod, M3 .50 Cal MG", basePrice: 1100 },
];

function generateNSN(idx) {
  const fsc = 1000 + (idx % 9000);
  const niin = 100000000 + (idx * 31337) % 900000000;
  const s = niin.toString();
  return `${fsc}-${s.slice(0,2)}-${s.slice(2,5)}-${s.slice(5,9)}`;
}

const TECH_NAMES = [
  "SGT Hernandez, M.", "CPL Reyes, J.", "SSGT Patel, R.", "LCPL Brown, T.",
  "SGT Nguyen, L.", "CPL O'Brien, K.", "GYSGT Williams, D.", "CPL Martinez, A.",
  "SGT Chen, W.", "LCPL Anderson, J.", "CPL Davis, R.", "SSGT Kim, H.",
  "Contractor: V2X-Diaz, R.", "Contractor: V2X-Smith, P.", "Contractor: V2X-Cole, N.",
  "Contractor: V2X-Walsh, E.", "Contractor: V2X-Park, S.",
];

const STATUSES = ["Inducted", "InWork", "AwaitingParts", "AwaitingQA", "ReadyForReturn"];

// ===========================================================================
// DATE UTILITIES
// ===========================================================================

const TODAY = new Date(CONFIG.asOfDate + "T00:00:00Z");
function daysAgo(d) {
  const t = new Date(TODAY);
  t.setUTCDate(t.getUTCDate() - d);
  return t.toISOString().split('T')[0];
}
function monthsAgo(m) {
  const t = new Date(TODAY);
  t.setUTCMonth(t.getUTCMonth() - m);
  return t.toISOString().split('T')[0];
}
function monthKey(monthsAgoNum) {
  const t = new Date(TODAY);
  t.setUTCMonth(t.getUTCMonth() - monthsAgoNum);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}`;
}

function deriveFyContext() {
  const anchorMonth = TODAY.getUTCMonth() + 1;
  const anchorYear = TODAY.getUTCFullYear();
  const fyStartYear = anchorMonth >= 10 ? anchorYear : anchorYear - 1;
  const fyEndYear = fyStartYear + 1;
  const fyStart = `${fyStartYear}-10-01`;
  const fyEnd = `${fyEndYear}-09-30`;
  let monthsElapsed;
  if (anchorMonth >= 10) monthsElapsed = anchorMonth - 9;
  else monthsElapsed = anchorMonth + 3;
  return { fyStart, fyEnd, monthsElapsed, fyStartYear, fyEndYear };
}

const FY = deriveFyContext();

// ===========================================================================
// BUILD INVENTORY
// ===========================================================================

const inventoryItems = [];
for (let i = 0; i < CONFIG.numInventory; i++) {
  const catalog = randChoice(SECREP_CATALOG);
  const nsn = generateNSN(i);
  const allowance = rand() < 0.7 ? randInt(2, 10) : randInt(10, 40);

  const r = rand();
  let on_hand_serv, on_hand_unserv, on_order;
  const lowThreshold = CONFIG.pct_healthy_inventory;
  const zeroThreshold = lowThreshold + CONFIG.pct_low_inventory;

  if (r < lowThreshold) {
    on_hand_serv = Math.max(allowance - randInt(0, 2), Math.floor(allowance * 0.7));
    on_hand_unserv = randInt(0, 2);
    on_order = randInt(0, 2);
  } else if (r < zeroThreshold) {
    const reorderPt = Math.max(1, Math.floor(allowance * 0.3));
    on_hand_serv = randInt(1, Math.max(1, reorderPt - 1));
    on_hand_unserv = randInt(0, 3);
    on_order = randInt(0, 3);
  } else {
    on_hand_serv = 0;
    on_hand_unserv = randInt(0, 2);
    on_order = randInt(0, 2);
  }

  inventoryItems.push({
    nsn,
    nomenclature: catalog.nomenclature,
    allowance_qty: allowance,
    on_hand_serviceable: on_hand_serv,
    on_hand_unserviceable: on_hand_unserv,
    on_order_qty: on_order,
    on_order_eta: on_order > 0 ? daysAgo(-randInt(7, 45)) : null,
    reorder_point: Math.max(1, Math.floor(allowance * 0.3)),
    unit_replacement_cost: catalog.basePrice,
  });
}

// Plant headline zero-stock items
const seededZeroStock = [
  {
    nomenclature: "Transmission Assembly, AAV-7A1",
    allowance_qty: 4, on_hand_unserviceable: 1, on_order_qty: 2,
    on_order_eta_offset: -12, unit_replacement_cost: 48500,
    _note: "Awaiting V2X repair return — ETA 12 days",
  },
  {
    nomenclature: "Radio Set, AN/PRC-117G",
    allowance_qty: 8, on_hand_unserviceable: 3, on_order_qty: 0,
    on_order_eta_offset: null, unit_replacement_cost: 12500,
    _note: "MRP credit pending — no requisition placed",
  },
  {
    nomenclature: "Night Vision Goggles, AN/PVS-31",
    allowance_qty: 12, on_hand_unserviceable: 2, on_order_qty: 4,
    on_order_eta_offset: -28, unit_replacement_cost: 13200,
    _note: "LOGCOM batch in progress — ETA 28 days",
  },
  {
    nomenclature: "Generator Set, 10kW MEP-803A",
    allowance_qty: 6, on_hand_unserviceable: 1, on_order_qty: 1,
    on_order_eta_offset: -45, unit_replacement_cost: 24300,
    _note: "Straight buy contract execution delayed",
  },
  {
    nomenclature: "Thermal Sight, AN/PAS-13G",
    allowance_qty: 10, on_hand_unserviceable: 4, on_order_qty: 0,
    on_order_eta_offset: null, unit_replacement_cost: 9800,
    _note: "No funding available — see budget shortfall",
  },
];

for (let i = 0; i < CONFIG.num_seeded_zero_stock && i < seededZeroStock.length; i++) {
  const s = seededZeroStock[i];
  inventoryItems[i] = {
    nsn: generateNSN(i),
    nomenclature: s.nomenclature,
    allowance_qty: s.allowance_qty,
    on_hand_serviceable: 0,
    on_hand_unserviceable: s.on_hand_unserviceable,
    on_order_qty: s.on_order_qty,
    on_order_eta: s.on_order_eta_offset !== null ? daysAgo(s.on_order_eta_offset) : null,
    reorder_point: Math.max(2, Math.floor(s.allowance_qty * 0.3)),
    unit_replacement_cost: s.unit_replacement_cost,
    _note: s._note,
  };
}

// ===========================================================================
// BUILD SERVICE REQUESTS
// ===========================================================================

const serviceRequests = [];
let woCounter = 1;

function newWO(opts) {
  const id = `WO-${FY.fyEndYear}-${String(woCounter).padStart(5, '0')}`;
  woCounter++;
  return { id, ...opts };
}

for (let i = 0; i < CONFIG.numOpenWO; i++) {
  const item = randChoice(inventoryItems);
  const r = rand();
  const tailPct = CONFIG.aging_skew_tail_pct;
  let inductionDaysAgo;
  if (r < 0.55) inductionDaysAgo = randInt(1, 30);
  else if (r < 0.80) inductionDaysAgo = randInt(31, 60);
  else if (r < (1.0 - tailPct)) inductionDaysAgo = randInt(61, 90);
  else inductionDaysAgo = randInt(91, 140);

  let status;
  if (inductionDaysAgo < 5) status = "Inducted";
  else if (inductionDaysAgo < 20) status = randChoice(["InWork", "InWork", "AwaitingParts"]);
  else if (inductionDaysAgo < 50) status = randChoice(["InWork", "AwaitingParts", "AwaitingQA"]);
  else status = randChoice(["AwaitingParts", "AwaitingQA", "ReadyForReturn"]);
  if (inductionDaysAgo > 90) status = randChoice(["AwaitingParts", "AwaitingParts", "InWork"]);

  const laborType = rand() < 0.6 ? "Marine" : "Contracted";
  serviceRequests.push(newWO({
    nsn: item.nsn,
    nomenclature: item.nomenclature,
    status,
    induction_date: daysAgo(inductionDaysAgo),
    close_date: null,
    labor_type: laborType,
    outcome: null,
    replacement_cost: item.unit_replacement_cost,
    assigned_tech: laborType === "Marine"
      ? randChoice(TECH_NAMES.filter(n => !n.startsWith("Contractor")))
      : randChoice(TECH_NAMES.filter(n => n.startsWith("Contractor"))),
    repair_source: randChoice(["IMA", "IMA", "IMA", "V2X", "LOGCOM"]),
  }));
}

const repairJobs = [];
const monthlyClosures = [];

for (let m = 11; m >= 0; m--) {
  const monthCount = randInt(95, 175);

  let marineRate = CONFIG.repair_rate_targets.marine + (rand() - 0.5) * 0.04;
  let v2xRate = CONFIG.repair_rate_targets.v2x + (rand() - 0.5) * 0.04;
  let logcomRate = CONFIG.repair_rate_targets.logcom + (rand() - 0.5) * 0.04;

  if (m === CONFIG.v2x_dip_month && CONFIG.v2x_dip_repair_rate !== null) {
    v2xRate = CONFIG.v2x_dip_repair_rate;
  }

  const marineBigTicketBoost = (m === CONFIG.marine_surge_month);

  const marineCWT = CONFIG.cwt_targets_days.marine + (rand() - 0.5) * 4;
  const v2xCWT = CONFIG.cwt_targets_days.v2x + (rand() - 0.5) * 4;
  const logcomCWT = CONFIG.cwt_targets_days.logcom + (rand() - 0.5) * 6;

  let marineCount = 0, v2xCount = 0, logcomCount = 0;
  let marineSucc = 0, v2xSucc = 0, logcomSucc = 0;
  let marineCWTSum = 0, v2xCWTSum = 0, logcomCWTSum = 0;
  let marineSavings = 0, v2xSavings = 0, logcomSavings = 0;

  for (let i = 0; i < monthCount; i++) {
    const item = randChoice(marineBigTicketBoost && rand() < 0.3
      ? SECREP_CATALOG.filter(c => c.basePrice > 10000)
      : SECREP_CATALOG);

    const laborType = rand() < 0.6 ? "Marine" : "Contracted";
    const repairSource = laborType === "Marine"
      ? "IMA"
      : randChoice(["V2X", "V2X", "LOGCOM"]);

    let rateTarget, cwtTarget;
    if (repairSource === "IMA") { rateTarget = marineRate; cwtTarget = marineCWT; }
    else if (repairSource === "V2X") { rateTarget = v2xRate; cwtTarget = v2xCWT; }
    else { rateTarget = logcomRate; cwtTarget = logcomCWT; }

    const success = rand() < rateTarget;
    const outcome = success ? "CodeB_Success" : "CodeF_WIR";
    const cwt = Math.max(3, Math.round(randNormal(cwtTarget, cwtTarget * 0.2)));

    const closeDaysAgo = m * 30 + randInt(0, 28);
    const closeDate = daysAgo(closeDaysAgo);
    const inductDate = daysAgo(closeDaysAgo + cwt);

    const repairCost = success
      ? Math.round(item.basePrice * (repairSource === "IMA" ? 0.15
                                  : repairSource === "V2X" ? 0.32 : 0.45))
      : Math.round(item.basePrice * 0.08);
    const costSavings = success ? item.basePrice - repairCost : 0;

    const wo = newWO({
      nsn: generateNSN(woCounter + i),
      nomenclature: item.nomenclature,
      status: "Closed",
      induction_date: inductDate,
      close_date: closeDate,
      labor_type: laborType,
      outcome,
      replacement_cost: item.basePrice,
      assigned_tech: laborType === "Marine"
        ? randChoice(TECH_NAMES.filter(n => !n.startsWith("Contractor")))
        : randChoice(TECH_NAMES.filter(n => n.startsWith("Contractor"))),
      repair_source: repairSource,
    });
    serviceRequests.push(wo);

    repairJobs.push({
      service_request_id: wo.id,
      repair_source: repairSource,
      cost: repairCost,
      cost_savings: costSavings,
      outcome,
      close_date: closeDate,
    });

    if (repairSource === "IMA") {
      marineCount++; marineCWTSum += cwt;
      if (success) { marineSucc++; marineSavings += costSavings; }
    } else if (repairSource === "V2X") {
      v2xCount++; v2xCWTSum += cwt;
      if (success) { v2xSucc++; v2xSavings += costSavings; }
    } else {
      logcomCount++; logcomCWTSum += cwt;
      if (success) { logcomSucc++; logcomSavings += costSavings; }
    }
  }

  monthlyClosures.push({
    month: monthKey(m),
    months_ago: m,
    total_closed: monthCount,
    marine: {
      count: marineCount, successes: marineSucc,
      repair_rate: marineCount ? +(marineSucc / marineCount).toFixed(3) : 0,
      avg_cwt_days: marineCount ? +(marineCWTSum / marineCount).toFixed(1) : 0,
      cost_savings: marineSavings,
    },
    v2x: {
      count: v2xCount, successes: v2xSucc,
      repair_rate: v2xCount ? +(v2xSucc / v2xCount).toFixed(3) : 0,
      avg_cwt_days: v2xCount ? +(v2xCWTSum / v2xCount).toFixed(1) : 0,
      cost_savings: v2xSavings,
    },
    logcom: {
      count: logcomCount, successes: logcomSucc,
      repair_rate: logcomCount ? +(logcomSucc / logcomCount).toFixed(3) : 0,
      avg_cwt_days: logcomCount ? +(logcomCWTSum / logcomCount).toFixed(1) : 0,
      cost_savings: logcomSavings,
    },
  });
}

// ===========================================================================
// MONTHLY INVENTORY FLOW
// ===========================================================================

const inventoryTransactions = [];
const monthlyInventoryFlow = [];

for (let m = 11; m >= 0; m--) {
  const monthLabel = monthKey(m);
  const v2xDipActive = (m === CONFIG.v2x_dip_month && CONFIG.v2x_dip_repair_rate !== null);

  const flows = {
    straight_buy_serv: randInt(35, 65),
    mrp_credit_serv: randInt(15, 35),
    initial_issue_serv: m > 8 ? randInt(8, 18) : randInt(0, 4),
    ima_repair_serv: randInt(40, 70),
    ima_repair_washout: randInt(4, 10),
    v2x_repair_serv: v2xDipActive ? randInt(18, 26) : randInt(28, 48),
    v2x_repair_washout: v2xDipActive ? randInt(10, 16) : randInt(5, 12),
    logcom_repair_serv: randInt(20, 38),
    logcom_repair_washout: randInt(5, 11),
    unit_turnin_unserv: randInt(55, 95),
    customer_issue_serv: randInt(110, 165),
  };

  for (const [source, qty] of Object.entries(flows)) {
    inventoryTransactions.push({
      month: monthLabel,
      source,
      qty,
      condition: source.includes("washout") || source.includes("unserv")
        ? "Unserviceable" : "Serviceable",
      direction: source === "customer_issue_serv" ? "Out" : "In",
    });
  }

  monthlyInventoryFlow.push({ month: monthLabel, months_ago: m, ...flows });
}

// ===========================================================================
// BUDGET LEDGER
// ===========================================================================

const targetObligated = Math.round(CONFIG.plannedBudget * CONFIG.target_pct_obligated_at_anchor);
const targetReceived = Math.round(CONFIG.plannedBudget * CONFIG.target_pct_received_at_anchor);

const threePLObligated = Math.round(targetObligated * 0.38);
const remainingObligated = targetObligated - threePLObligated;
const obligationsByCategory = {
  straight_buy: Math.round(remainingObligated * 0.52),
  mrp: Math.round(remainingObligated * 0.16),
  three_pl_v2x: threePLObligated,
  logcom: 0,
};
obligationsByCategory.logcom =
  targetObligated - obligationsByCategory.straight_buy
                  - obligationsByCategory.mrp
                  - obligationsByCategory.three_pl_v2x;

const threePLShortfall = CONFIG.three_pl_shortfall_target;
const shortfallByCategory = {
  straight_buy: Math.round(threePLShortfall * 0.20),
  mrp: Math.round(threePLShortfall * 0.07),
  three_pl_v2x: threePLShortfall,
  logcom: Math.round(threePLShortfall * 0.10),
};
const totalShortfall = Object.values(shortfallByCategory).reduce((a, b) => a + b, 0);

function buildCumulativeSeries(totalAtAnchor, monthsElapsed, fyStartYear) {
  const series = [];
  const fyMonths = ["Oct","Nov","Dec","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep"];
  for (let i = 0; i < monthsElapsed; i++) {
    const monthName = fyMonths[i];
    const calendarYear = i < 3 ? fyStartYear : fyStartYear + 1;
    const t = (i + 1) / monthsElapsed;
    const fraction = Math.pow(t, 1.05);
    const cumulative = i === monthsElapsed - 1
      ? totalAtAnchor
      : Math.round(totalAtAnchor * fraction);
    series.push({ fy_month: `${monthName} ${calendarYear}`, cumulative });
  }
  return series;
}

const cumulativeObligationByMonth = buildCumulativeSeries(
  targetObligated, FY.monthsElapsed, FY.fyStartYear
);
const cumulativeReceiptByMonth = buildCumulativeSeries(
  targetReceived, FY.monthsElapsed, FY.fyStartYear
);

const budgetLedger = {
  fiscal_year: CONFIG.fiscalYear,
  fy_start_date: FY.fyStart,
  fy_end_date: FY.fyEnd,
  fy_months_elapsed: FY.monthsElapsed,
  planned_allocation: CONFIG.plannedBudget,
  received_to_date: targetReceived,
  total_obligated: targetObligated,
  obligations_by_category: obligationsByCategory,
  shortfall_by_category: shortfallByCategory,
  total_shortfall: totalShortfall,
  pct_received: +(targetReceived / CONFIG.plannedBudget * 100).toFixed(1),
  pct_obligated: +(targetObligated / CONFIG.plannedBudget * 100).toFixed(1),
  cumulative_obligation_by_month: cumulativeObligationByMonth,
  cumulative_receipt_by_month: cumulativeReceiptByMonth,
};

// ===========================================================================
// ROLLUPS
// ===========================================================================

const openWO = serviceRequests.filter(wo => wo.status !== "Closed");
const openByStatus = {};
STATUSES.forEach(s => openByStatus[s] = 0);
openWO.forEach(wo => { openByStatus[wo.status] = (openByStatus[wo.status] || 0) + 1; });

const agingWO = openWO.filter(wo => {
  const induct = new Date(wo.induction_date);
  return Math.floor((TODAY - induct) / (1000 * 60 * 60 * 24)) > 90;
});

const currentMonth = monthlyClosures.find(m => m.months_ago === 0);

const inventoryHealth = {
  total_serviceable: inventoryItems.reduce((s, i) => s + i.on_hand_serviceable, 0),
  total_unserviceable: inventoryItems.reduce((s, i) => s + i.on_hand_unserviceable, 0),
  total_on_order: inventoryItems.reduce((s, i) => s + i.on_order_qty, 0),
  total_allowance: inventoryItems.reduce((s, i) => s + i.allowance_qty, 0),
  zero_stock_count: inventoryItems.filter(i => i.on_hand_serviceable === 0).length,
  low_stock_count: inventoryItems.filter(i =>
    i.on_hand_serviceable > 0 && i.on_hand_serviceable < i.reorder_point).length,
};
inventoryHealth.health_pct = +(
  inventoryHealth.total_serviceable /
  Math.max(inventoryHealth.total_serviceable + inventoryHealth.total_unserviceable, 1) * 100
).toFixed(1);
inventoryHealth.allowance_fulfillment_pct = +(
  (inventoryHealth.total_serviceable + inventoryHealth.total_unserviceable + inventoryHealth.total_on_order) /
  Math.max(inventoryHealth.total_allowance, 1) * 100
).toFixed(1);

const kpiSnapshot = {
  as_of: CONFIG.asOfDate,
  ima: {
    open_work_orders: openWO.length,
    aging_over_90_days: agingWO.length,
    repair_rate_pct_current_month: currentMonth
      ? +((currentMonth.marine.successes + currentMonth.v2x.successes + currentMonth.logcom.successes) /
          Math.max(currentMonth.total_closed, 1) * 100).toFixed(1)
      : 0,
    avg_customer_wait_time_days_current_month: currentMonth
      ? +((currentMonth.marine.avg_cwt_days * currentMonth.marine.count +
            currentMonth.v2x.avg_cwt_days * currentMonth.v2x.count +
            currentMonth.logcom.avg_cwt_days * currentMonth.logcom.count) /
            Math.max(currentMonth.total_closed, 1)).toFixed(1)
      : 0,
    cost_savings_current_month: currentMonth
      ? currentMonth.marine.cost_savings + currentMonth.v2x.cost_savings + currentMonth.logcom.cost_savings
      : 0,
  },
  rip: {
    inventory_health_pct: inventoryHealth.health_pct,
    allowance_fulfillment_pct: inventoryHealth.allowance_fulfillment_pct,
    zero_stock_count: inventoryHealth.zero_stock_count,
    low_stock_count: inventoryHealth.low_stock_count,
    budget_obligated_pct: budgetLedger.pct_obligated,
    budget_shortfall: budgetLedger.total_shortfall,
  },
};

const callouts = [];
if (inventoryHealth.zero_stock_count > 0) {
  callouts.push(`${inventoryHealth.zero_stock_count} SECREPs at zero stock`);
}
const ytdSavings = monthlyClosures.reduce((s, m) =>
  s + m.marine.cost_savings + m.v2x.cost_savings + m.logcom.cost_savings, 0);
callouts.push(`$${(ytdSavings / 1_000_000).toFixed(1)}M cost savings YTD`);

const v2xCurr = monthlyClosures.find(m => m.months_ago === 0)?.v2x.repair_rate || 0;
const v2xPrev = monthlyClosures.find(m => m.months_ago === 1)?.v2x.repair_rate || 0;
if (v2xPrev - v2xCurr > 0.04) {
  callouts.push(`V2X repair rate down ${Math.round((v2xPrev - v2xCurr) * 100)} points MoM`);
}
if (budgetLedger.total_shortfall > 500_000) {
  callouts.push(`$${(budgetLedger.total_shortfall / 1000).toFixed(0)}K budget shortfall (3PL)`);
}
const commanderCallout = callouts.join("  |  ");

function buildAnomalyList() {
  const a = [];
  if (CONFIG.v2x_dip_month >= 0 && CONFIG.v2x_dip_repair_rate !== null) {
    a.push(`V2X repair rate dip in month ${CONFIG.v2x_dip_month} (${monthKey(CONFIG.v2x_dip_month)}) — target ${(CONFIG.v2x_dip_repair_rate * 100).toFixed(0)}%`);
  }
  if (CONFIG.marine_surge_month >= 0) {
    a.push(`Marine labor cost-savings surge in month ${CONFIG.marine_surge_month} (${monthKey(CONFIG.marine_surge_month)}) via big-ticket repairs`);
  }
  if (CONFIG.num_seeded_zero_stock > 0) {
    a.push(`${CONFIG.num_seeded_zero_stock} SECREP(s) seeded at zero stock with named context`);
  }
  a.push(`Budget at ~${(CONFIG.target_pct_obligated_at_anchor * 100).toFixed(0)}% obligated with ~$${(CONFIG.three_pl_shortfall_target / 1000).toFixed(0)}K 3PL shortfall`);
  if (CONFIG.aging_skew_tail_pct > 0) {
    a.push(`~${(CONFIG.aging_skew_tail_pct * 100).toFixed(0)}% of open work orders skewed to >90-day aging`);
  }
  return a;
}

// ===========================================================================
// ASSEMBLE
// ===========================================================================

const seed_data = {
  meta: {
    generated_at: new Date().toISOString(),
    generator_config: {
      scenario: CONFIG.scenario,
      scenario_description: CONFIG.scenarioDescription,
      random_seed: CONFIG.seed,
    },
    unit: CONFIG.unit,
    classification: CONFIG.classification,
    as_of_date: CONFIG.asOfDate,
    fiscal_year: CONFIG.fiscalYear,
    fy_start_date: FY.fyStart,
    fy_end_date: FY.fyEnd,
    description: `Synthetic seed data for Commanders Dashboard for SECREPs demo (${CONFIG.scenario} scenario). 12 months of battalion activity.`,
    seeded_anomalies: buildAnomalyList(),
  },
  kpi_snapshot: kpiSnapshot,
  commander_callout: commanderCallout,
  service_requests: serviceRequests,
  open_work_orders_summary: {
    total: openWO.length,
    by_status: openByStatus,
    aging_over_90_days: agingWO.length,
    aging_items: agingWO.map(wo => {
      const induct = new Date(wo.induction_date);
      const days = Math.floor((TODAY - induct) / (1000 * 60 * 60 * 24));
      return {
        id: wo.id, nsn: wo.nsn, nomenclature: wo.nomenclature,
        days_open: days, status: wo.status,
        assigned_tech: wo.assigned_tech, labor_type: wo.labor_type,
      };
    }).sort((a, b) => b.days_open - a.days_open),
  },
  inventory_items: inventoryItems,
  inventory_health: inventoryHealth,
  low_and_zero_stock_items: inventoryItems
    .filter(i => i.on_hand_serviceable === 0 || i.on_hand_serviceable < i.reorder_point)
    .sort((a, b) => a.on_hand_serviceable - b.on_hand_serviceable)
    .slice(0, 40),
  inventory_transactions: inventoryTransactions,
  monthly_inventory_flow: monthlyInventoryFlow,
  repair_jobs: repairJobs,
  monthly_closures: monthlyClosures,
  budget_ledger: budgetLedger,
  repair_source_summary_current_month: currentMonth ? {
    ima: {
      ...currentMonth.marine,
      total_cost: repairJobs.filter(r => r.repair_source === "IMA" && r.close_date >= monthsAgo(1))
        .reduce((s, r) => s + r.cost, 0),
    },
    v2x: {
      ...currentMonth.v2x,
      total_cost: repairJobs.filter(r => r.repair_source === "V2X" && r.close_date >= monthsAgo(1))
        .reduce((s, r) => s + r.cost, 0),
    },
    logcom: {
      ...currentMonth.logcom,
      total_cost: repairJobs.filter(r => r.repair_source === "LOGCOM" && r.close_date >= monthsAgo(1))
        .reduce((s, r) => s + r.cost, 0),
    },
  } : null,
};

// ===========================================================================
// WRITE & REPORT
// ===========================================================================

const outputPath = path.resolve(CONFIG.outputPath);
fs.writeFileSync(outputPath, JSON.stringify(seed_data, null, 2));
const stats = fs.statSync(outputPath);

console.log("=".repeat(72));
console.log(`Commanders Dashboard for SECREPs — seed generator`);
console.log("=".repeat(72));
console.log(`Scenario:        ${CONFIG.scenario}  (${CONFIG.scenarioDescription})`);
console.log(`Random seed:     ${CONFIG.seed}`);
console.log(`Unit:            ${CONFIG.unit}`);
console.log(`As of:           ${CONFIG.asOfDate}`);
console.log(`Fiscal year:     ${CONFIG.fiscalYear} (${FY.fyStart} → ${FY.fyEnd}, month ${FY.monthsElapsed}/12)`);
console.log(`Output:          ${outputPath}  (${(stats.size / 1024).toFixed(1)} KB)`);
console.log("-".repeat(72));
console.log(`Service requests:   ${seed_data.service_requests.length}`);
console.log(`  Open:             ${seed_data.open_work_orders_summary.total}`);
console.log(`  Aging > 90 days:  ${seed_data.open_work_orders_summary.aging_over_90_days}`);
console.log(`Inventory items:    ${seed_data.inventory_items.length}`);
console.log(`  Zero stock:       ${seed_data.inventory_health.zero_stock_count}`);
console.log(`  Low stock:        ${seed_data.inventory_health.low_stock_count}`);
console.log(`  Health:           ${seed_data.inventory_health.health_pct}%`);
console.log(`Budget obligated:   ${seed_data.budget_ledger.pct_obligated}%`);
console.log(`Total shortfall:    $${(seed_data.budget_ledger.total_shortfall / 1000).toFixed(0)}K`);
console.log("-".repeat(72));
console.log(`Commander's callout:`);
console.log(`  ${seed_data.commander_callout}`);
console.log("=".repeat(72));
