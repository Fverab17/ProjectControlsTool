// ===========================================================================
// CPM Training Clone — UI Prototype (single-file React)
// ===========================================================================
// This is the planning-session prototype, intended as a starting point for
// the real frontend build. See SPEC.md §9 for the design direction.
//
// What's REAL in this file (keep these decisions):
//   - Visual language: IBM Plex Sans/Mono, petrol-teal accent, warm off-white
//   - Information architecture: sidebar nav, top bar with period selector,
//     two screens (Project Setup tabs, Cost Control grid)
//   - Cost Control grid columns: WBS / Description / %Comp / BAC / EV / AC /
//     Open Commit / ETC / EAC / CPI / VAC — these are the EVM textbook set
//   - Grid behaviors: frozen left columns, expand/collapse rollups, search,
//     CPI color-coding, parentheses on negative variance
//   - Project Setup tabs: WBS, CBS, Periods (with lock/current/future state),
//     Baselines (parallel kinds: Baseline / Approved / Control / Forecast)
//
// What's MOCKED (replace with real data from the API):
//   - The RAW_WBS seed array and buildModel() — replace with a query against
//     GET /projects/:id/cost-control
//   - The CBS list in CbsEditor — replace with project_id-scoped query
//   - The periods array in PeriodsEditor — replace with periods query
//   - The baselines array in BaselinesEditor — replace with baselines query
//   - The hardcoded "PETROCHEM·EXP·2024" in the sidebar — replace with
//     selected-project name from context/store
//   - The "F. VERA · COST ENGINEER" footer — replace with logged-in user
//
// What's STUBBED (to be designed/built):
//   - EVM Dashboard, Change Management, Procurement, Reports screens —
//     placeholder components only
//   - Drill-down detail panel for a cost account — discussed but not built
//     (open question: drawer vs. full-page vs. modal)
//   - Edit modes — everything is currently read-only
//   - Time-phased grid (account × period matrix)
//
// When porting to the real codebase:
//   - Split this single file into proper component files under
//     frontend/src/components/{Layout,CostControl,ProjectSetup}/
//   - Switch to TypeScript
//   - Replace the hand-rolled table with AG Grid Community for the cost
//     control screen (needed for 1000+ row virtualization with real data)
//   - Use TanStack Query for data fetching, Zustand or Context for selected
//     project / period state
// ===========================================================================

import React, { useState, useMemo } from "react";
import {
  LayoutGrid,
  Settings2,
  FileBarChart,
  GitBranch,
  Receipt,
  CalendarRange,
  ChevronRight,
  ChevronDown,
  Search,
  ArrowUpDown,
  Filter,
  Download,
  Plus,
  Lock,
  Unlock,
  CheckCircle2,
  Circle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
//  Mock data: a realistic ~$300M EPC capital project
// ─────────────────────────────────────────────────────────────

const RAW_WBS = [
  ["1",       "Engineering Services",                         30_000, 0.68, 0.94],
  ["1.1",     "Process & Front-End Engineering",              12_000, 0.85, 0.96],
  ["1.2",     "Mechanical Engineering",                        8_000, 0.72, 0.92],
  ["1.3",     "Electrical & Instrumentation Engineering",      6_000, 0.55, 0.91],
  ["1.4",     "Civil / Structural Engineering",                4_000, 0.48, 0.95],
  ["2",       "Procurement",                                 120_000, 0.62, 0.97],
  ["2.1",     "Major Equipment",                              80_000, 0.71, 0.99],
  ["2.1.1",   "Compressors & Pumps",                          30_000, 0.78, 1.02],
  ["2.1.2",   "Vessels & Tanks",                              25_000, 0.82, 0.98],
  ["2.1.3",   "Heat Exchangers & Furnaces",                   15_000, 0.65, 0.94],
  ["2.1.4",   "Packaged Process Units",                       10_000, 0.45, 0.99],
  ["2.2",     "Bulk Materials",                               35_000, 0.50, 0.93],
  ["2.2.1",   "Piping & Valves",                              18_000, 0.55, 0.91],
  ["2.2.2",   "Structural Steel",                              8_000, 0.62, 0.96],
  ["2.2.3",   "Electrical Bulks",                              5_000, 0.38, 0.92],
  ["2.2.4",   "Instrumentation Bulks",                         4_000, 0.32, 0.95],
  ["2.3",     "Logistics & Freight",                           5_000, 0.45, 0.88],
  ["3",       "Construction",                                105_000, 0.34, 0.89],
  ["3.1",     "Civil Works & Foundations",                    15_000, 0.78, 0.92],
  ["3.2",     "Structural Steel Erection",                    12_000, 0.52, 0.88],
  ["3.3",     "Mechanical Installation",                      35_000, 0.28, 0.86],
  ["3.4",     "Piping Installation",                          25_000, 0.22, 0.87],
  ["3.5",     "Electrical & I&C Installation",                15_000, 0.12, 0.91],
  ["3.6",     "Insulation & Painting",                         3_000, 0.05, 1.00],
  ["4",       "Commissioning & Startup",                      15_000, 0.02, 1.00],
  ["5",       "Project Management Services",                  15_000, 0.55, 0.93],
  ["6",       "Owner's Costs & Contingency",                  15_000, 0.40, 1.00],
];

// Build out the hierarchical model with all EVM columns derived from the seeds.
function buildModel() {
  return RAW_WBS.map(([code, desc, bac, pct, cpi]) => {
    const level = code.split(".").length - 1;
    const isRoll = RAW_WBS.some(([c]) => c !== code && c.startsWith(code + "."));
    const parent = code.includes(".") ? code.slice(0, code.lastIndexOf(".")) : null;
    const earned = bac * pct;
    const actual = earned / cpi;
    const etc = bac - earned;
    const eac = actual + etc / cpi;
    const vac = bac - eac;
    const openCommit = Math.max(0, bac * 0.85 - actual) * 0.6;
    return {
      code, desc, level, isRoll, parent,
      bac, pct, cpi,
      earned, actual, openCommit,
      etc, eac, vac,
      spi: 0.85 + Math.random() * 0.25,
    };
  });
}

const MODEL = buildModel();
const PROJECT_TOTAL = MODEL.filter(n => n.level === 0).reduce((s, n) => s + n.bac, 0);

// ─────────────────────────────────────────────────────────────
//  Utilities
// ─────────────────────────────────────────────────────────────

const fmt = (n, opts = {}) => {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const { decimals = 0, suffix = "" } = opts;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }) + suffix;
};

const pctFmt = (n) => (n * 100).toFixed(1) + "%";

const varianceColor = (v) => {
  if (v > 0.02) return "text-[var(--ink-positive)]";
  if (v < -0.02) return "text-[var(--ink-negative)]";
  return "text-[var(--ink-muted)]";
};

// ─────────────────────────────────────────────────────────────
//  App shell
// ─────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState("cost-control");
  const [period, setPeriod] = useState("2024-04");

  return (
    <div
      className="h-screen w-full flex font-sans text-[13px]"
      style={{
        "--app-bg": "#F4F4EE",
        "--surface": "#FFFFFF",
        "--surface-alt": "#FAFAF5",
        "--surface-hover": "#F0F0E8",
        "--border": "#E3E3DA",
        "--border-strong": "#CFCFC2",
        "--ink-1": "#161614",
        "--ink-2": "#3F3F3A",
        "--ink-3": "#6B6B63",
        "--ink-muted": "#9A9A8E",
        "--accent": "#0F4C5C",
        "--accent-soft": "#E3EEF1",
        "--ink-positive": "#15633F",
        "--ink-negative": "#A4322B",
        "--ink-warning": "#9A5B12",
        "--sidebar-bg": "#161614",
        "--sidebar-ink": "#E8E8DE",
        "--sidebar-ink-muted": "#7A7A70",
        "--sidebar-border": "#2A2A26",
        fontFamily:
          '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        background: "var(--app-bg)",
        color: "var(--ink-1)",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        .num { font-family: "IBM Plex Mono", ui-monospace, monospace; font-variant-numeric: tabular-nums; }
        .cell-num { text-align: right; padding: 0.4rem 0.75rem; white-space: nowrap; }
        .grid-row:hover { background: var(--surface-hover); }
        .grid-row.is-roll { font-weight: 500; background: var(--surface-alt); }
        .grid-row.is-roll.lvl-0 { background: #ECECE2; }
        .frozen-shadow { box-shadow: 4px 0 0 -3px rgba(0,0,0,0.04), 6px 0 16px -8px rgba(0,0,0,0.08); }
        .tnum { font-variant-numeric: tabular-nums; }
        ::-webkit-scrollbar { width: 10px; height: 10px; }
        ::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <Sidebar screen={screen} setScreen={setScreen} />

      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar period={period} setPeriod={setPeriod} screen={screen} />
        <div className="flex-1 overflow-hidden">
          {screen === "cost-control" && <CostControl period={period} />}
          {screen === "setup" && <ProjectSetup />}
          {screen === "evm" && <PlaceholderScreen label="EVM Dashboard" />}
          {screen === "changes" && <PlaceholderScreen label="Change Management" />}
          {screen === "procurement" && <PlaceholderScreen label="Procurement" />}
          {screen === "reports" && <PlaceholderScreen label="Reports" />}
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Sidebar
// ─────────────────────────────────────────────────────────────

function Sidebar({ screen, setScreen }) {
  const items = [
    { id: "setup",       label: "Project Setup",     icon: Settings2 },
    { id: "cost-control",label: "Cost Control",      icon: LayoutGrid },
    { id: "evm",         label: "EVM Dashboard",     icon: FileBarChart },
    { id: "changes",     label: "Change Management", icon: GitBranch },
    { id: "procurement", label: "Procurement",       icon: Receipt },
    { id: "reports",     label: "Reports",           icon: CalendarRange },
  ];
  return (
    <aside
      className="w-[220px] flex-shrink-0 flex flex-col"
      style={{
        background: "var(--sidebar-bg)",
        color: "var(--sidebar-ink)",
        borderRight: "1px solid var(--sidebar-border)",
      }}
    >
      <div className="px-5 py-5" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
        <div className="text-[10px] tracking-[0.18em] uppercase" style={{ color: "var(--sidebar-ink-muted)" }}>
          Project
        </div>
        <div className="mt-1 text-[15px] font-semibold leading-tight">PETROCHEM·EXP·2024</div>
        <div className="mt-2 flex items-center gap-2 text-[11px]" style={{ color: "var(--sidebar-ink-muted)" }}>
          <span>USD</span>
          <span>·</span>
          <span>48 periods</span>
          <span>·</span>
          <span className="num">{(PROJECT_TOTAL / 1000).toFixed(1)}M BAC</span>
        </div>
      </div>

      <nav className="flex-1 py-3">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setScreen(id)}
            className="w-full flex items-center gap-3 px-5 py-2 text-[13px] text-left transition-colors"
            style={{
              background: screen === id ? "rgba(255,255,255,0.06)" : "transparent",
              color: screen === id ? "var(--sidebar-ink)" : "var(--sidebar-ink-muted)",
              borderLeft: screen === id ? "2px solid #E8E8DE" : "2px solid transparent",
              fontWeight: screen === id ? 500 : 400,
            }}
          >
            <Icon size={15} strokeWidth={1.6} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="px-5 py-4 text-[10px] tracking-wider" style={{ color: "var(--sidebar-ink-muted)", borderTop: "1px solid var(--sidebar-border)" }}>
        <div>F. VERA · COST ENGINEER</div>
        <div className="mt-1">v0.1 · training build</div>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────
//  Top bar
// ─────────────────────────────────────────────────────────────

function TopBar({ period, setPeriod, screen }) {
  const labels = {
    "cost-control": "Cost Control",
    setup: "Project Setup",
    evm: "EVM Dashboard",
    changes: "Change Management",
    procurement: "Procurement",
    reports: "Reports",
  };
  const periods = [
    "2024-01","2024-02","2024-03","2024-04","2024-05","2024-06",
  ];
  return (
    <header
      className="h-[52px] flex items-center justify-between px-6 flex-shrink-0"
      style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-3">
        <div className="text-[10px] tracking-[0.18em] uppercase" style={{ color: "var(--ink-3)" }}>
          Module
        </div>
        <div className="text-[14px] font-semibold">{labels[screen]}</div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 text-[12px]" style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", borderRadius: 4 }}>
          <CalendarRange size={13} style={{ color: "var(--ink-3)" }} />
          <span style={{ color: "var(--ink-3)" }}>Period</span>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-transparent border-0 font-medium num text-[12px] outline-none cursor-pointer"
            style={{ color: "var(--ink-1)" }}
          >
            {periods.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <button className="px-3 py-1.5 text-[12px] flex items-center gap-2" style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--ink-2)" }}>
          <Download size={13} />
          Export
        </button>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────
//  Cost Control Screen
// ─────────────────────────────────────────────────────────────

function CostControl() {
  const [expanded, setExpanded] = useState(() => new Set(["1", "2", "2.1", "2.2", "3"]));
  const [view, setView] = useState("cost");
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    return MODEL.filter((n) => {
      // hide if any ancestor is collapsed
      if (n.parent) {
        let p = n.parent;
        while (p) {
          if (!expanded.has(p)) return false;
          const parent = MODEL.find((m) => m.code === p);
          p = parent ? parent.parent : null;
        }
      }
      if (search) {
        const q = search.toLowerCase();
        return n.code.includes(q) || n.desc.toLowerCase().includes(q);
      }
      return true;
    });
  }, [expanded, search]);

  const totals = useMemo(() => {
    const roots = MODEL.filter((n) => n.level === 0);
    return roots.reduce(
      (acc, n) => ({
        bac: acc.bac + n.bac,
        earned: acc.earned + n.earned,
        actual: acc.actual + n.actual,
        openCommit: acc.openCommit + n.openCommit,
        etc: acc.etc + n.etc,
        eac: acc.eac + n.eac,
      }),
      { bac: 0, earned: 0, actual: 0, openCommit: 0, etc: 0, eac: 0 }
    );
  }, []);

  const toggle = (code) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Filter bar */}
      <div
        className="flex items-center gap-3 px-6 py-2.5 flex-shrink-0"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 px-3 py-1.5 text-[12px] flex-1 max-w-[320px]" style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", borderRadius: 4 }}>
          <Search size={13} style={{ color: "var(--ink-muted)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search WBS or description…"
            className="bg-transparent border-0 outline-none flex-1"
            style={{ color: "var(--ink-1)" }}
          />
        </div>

        <div className="flex" style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", borderRadius: 4 }}>
          {["cost", "hours", "composite"].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-3 py-1.5 text-[12px] capitalize transition-colors"
              style={{
                background: view === v ? "var(--accent)" : "transparent",
                color: view === v ? "#fff" : "var(--ink-2)",
                fontWeight: view === v ? 500 : 400,
              }}
            >
              {v}
            </button>
          ))}
        </div>

        <button className="px-3 py-1.5 text-[12px] flex items-center gap-2" style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--ink-2)" }}>
          <Filter size={13} />
          Filter
        </button>

        <div className="flex-1" />

        <div className="flex items-center gap-4 text-[11px]" style={{ color: "var(--ink-3)" }}>
          <span>{visible.length} of {MODEL.length} rows</span>
          <span>·</span>
          <span>thousands USD</span>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto" style={{ background: "var(--surface)" }}>
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <tr style={{ background: "var(--surface-alt)", borderBottom: "2px solid var(--border-strong)" }}>
              <Th sticky left={0} width={80} align="left">WBS</Th>
              <Th sticky left={80} width={320} align="left" shadow>Description</Th>
              <Th align="right">% Comp</Th>
              <Th align="right">BAC (Control)</Th>
              <Th align="right">Earned (EV)</Th>
              <Th align="right">Actual (AC)</Th>
              <Th align="right">Open Commit</Th>
              <Th align="right">ETC</Th>
              <Th align="right">EAC</Th>
              <Th align="right">CPI</Th>
              <Th align="right">VAC</Th>
            </tr>
          </thead>
          <tbody>
            {visible.map((n) => (
              <Row
                key={n.code}
                node={n}
                expanded={expanded.has(n.code)}
                onToggle={() => toggle(n.code)}
              />
            ))}
          </tbody>
          <tfoot className="sticky bottom-0">
            <tr style={{ background: "#161614", color: "#E8E8DE" }}>
              <td className="px-3 py-2 text-[11px] tracking-[0.12em] uppercase" colSpan={2}>
                Project Total
              </td>
              <td className="cell-num num">—</td>
              <td className="cell-num num">{fmt(totals.bac)}</td>
              <td className="cell-num num">{fmt(totals.earned)}</td>
              <td className="cell-num num">{fmt(totals.actual)}</td>
              <td className="cell-num num">{fmt(totals.openCommit)}</td>
              <td className="cell-num num">{fmt(totals.etc)}</td>
              <td className="cell-num num">{fmt(totals.eac)}</td>
              <td className="cell-num num">{(totals.earned / totals.actual).toFixed(2)}</td>
              <td className="cell-num num" style={{
                color: totals.bac - totals.eac >= 0 ? "#7DD3A6" : "#F4A89F",
              }}>
                {fmt(totals.bac - totals.eac)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function Th({ children, align = "left", sticky, left, width, shadow }) {
  return (
    <th
      className={`px-3 py-2.5 text-[10px] tracking-[0.10em] uppercase font-medium ${shadow ? "frozen-shadow" : ""}`}
      style={{
        textAlign: align,
        color: "var(--ink-3)",
        position: sticky ? "sticky" : undefined,
        left: sticky ? left : undefined,
        width: width,
        background: "var(--surface-alt)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Row({ node, expanded, onToggle }) {
  const vacPct = node.vac / node.bac;
  return (
    <tr
      className={`grid-row ${node.isRoll ? "is-roll" : ""} lvl-${node.level}`}
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <td
        className="px-3 num text-[12px]"
        style={{
          position: "sticky",
          left: 0,
          background: node.isRoll
            ? node.level === 0 ? "#ECECE2" : "var(--surface-alt)"
            : "var(--surface)",
          color: "var(--ink-2)",
        }}
      >
        {node.code}
      </td>
      <td
        className="px-3 py-1.5 frozen-shadow text-[12.5px]"
        style={{
          position: "sticky",
          left: 80,
          background: node.isRoll
            ? node.level === 0 ? "#ECECE2" : "var(--surface-alt)"
            : "var(--surface)",
        }}
      >
        <div className="flex items-center" style={{ paddingLeft: node.level * 16 }}>
          {node.isRoll ? (
            <button
              onClick={onToggle}
              className="mr-1.5 p-0.5 hover:bg-black/5 rounded"
              style={{ color: "var(--ink-3)" }}
            >
              {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
          ) : (
            <span className="mr-1.5 inline-block w-[18px]" />
          )}
          <span style={{
            color: "var(--ink-1)",
            fontWeight: node.level === 0 ? 600 : node.isRoll ? 500 : 400,
          }}>
            {node.desc}
          </span>
        </div>
      </td>
      <td className="cell-num num text-[12px]">
        <ProgressCell pct={node.pct} />
      </td>
      <td className="cell-num num text-[12px]">{fmt(node.bac)}</td>
      <td className="cell-num num text-[12px]">{fmt(node.earned)}</td>
      <td className="cell-num num text-[12px]">{fmt(node.actual)}</td>
      <td className="cell-num num text-[12px]" style={{ color: "var(--ink-3)" }}>
        {fmt(node.openCommit)}
      </td>
      <td className="cell-num num text-[12px]" style={{ color: "var(--ink-3)" }}>
        {fmt(node.etc)}
      </td>
      <td className="cell-num num text-[12px]" style={{ fontWeight: 500 }}>
        {fmt(node.eac)}
      </td>
      <td className={`cell-num num text-[12px] ${node.cpi >= 1 ? "text-[var(--ink-positive)]" : node.cpi >= 0.95 ? "text-[var(--ink-warning)]" : "text-[var(--ink-negative)]"}`}>
        {node.cpi.toFixed(2)}
      </td>
      <td className={`cell-num num text-[12px] ${varianceColor(vacPct)}`} style={{ fontWeight: 500 }}>
        {node.vac >= 0 ? "" : "("}
        {fmt(Math.abs(node.vac))}
        {node.vac >= 0 ? "" : ")"}
      </td>
    </tr>
  );
}

function ProgressCell({ pct }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <div
        className="h-[5px] w-[44px] rounded-full overflow-hidden"
        style={{ background: "var(--border)" }}
      >
        <div
          className="h-full"
          style={{
            width: `${pct * 100}%`,
            background: pct >= 0.95 ? "var(--ink-positive)" : "var(--accent)",
          }}
        />
      </div>
      <span style={{ width: 42, color: "var(--ink-2)" }}>{pctFmt(pct)}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Project Setup Screen
// ─────────────────────────────────────────────────────────────

function ProjectSetup() {
  const [tab, setTab] = useState("wbs");
  const tabs = [
    { id: "wbs",       label: "Work Breakdown (WBS)" },
    { id: "cbs",       label: "Cost Breakdown (CBS)" },
    { id: "periods",   label: "Reporting Periods" },
    { id: "baselines", label: "Baselines" },
  ];

  return (
    <div className="h-full flex flex-col">
      <div
        className="px-6 flex-shrink-0"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex gap-1">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="px-3 py-2.5 text-[12.5px] relative"
              style={{
                color: tab === id ? "var(--ink-1)" : "var(--ink-3)",
                fontWeight: tab === id ? 500 : 400,
                borderBottom: tab === id ? "2px solid var(--accent)" : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {tab === "wbs" && <WbsEditor />}
        {tab === "cbs" && <CbsEditor />}
        {tab === "periods" && <PeriodsEditor />}
        {tab === "baselines" && <BaselinesEditor />}
      </div>
    </div>
  );
}

function WbsEditor() {
  return (
    <div className="max-w-[920px]">
      <SectionHeader
        title="Work Breakdown Structure"
        sub="Hierarchy of deliverables that organizes the project scope. Codes are dotted (e.g. 1.2.3). Cost accounts are tagged to a WBS node, never the reverse."
        action="Add Node"
      />

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4 }}>
        <div className="grid grid-cols-[110px_1fr_140px_80px] px-4 py-2.5 text-[10px] tracking-[0.12em] uppercase" style={{ background: "var(--surface-alt)", borderBottom: "1px solid var(--border)", color: "var(--ink-3)" }}>
          <div>Code</div>
          <div>Description</div>
          <div className="text-right">Accounts</div>
          <div className="text-right">Level</div>
        </div>
        {MODEL.filter((n) => n.level < 2).map((n) => (
          <div
            key={n.code}
            className="grid grid-cols-[110px_1fr_140px_80px] px-4 py-2 items-center text-[12.5px]"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div className="num" style={{ color: "var(--ink-2)" }}>{n.code}</div>
            <div style={{ paddingLeft: n.level * 18, fontWeight: n.level === 0 ? 600 : 400 }}>
              {n.desc}
            </div>
            <div className="text-right num" style={{ color: "var(--ink-3)" }}>
              {Math.floor(8 + Math.random() * 40)}
            </div>
            <div className="text-right num" style={{ color: "var(--ink-3)" }}>{n.level + 1}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CbsEditor() {
  const cbs = [
    ["L",       "Labor"],
    ["L.E",     "Engineering Labor"],
    ["L.C",     "Construction Labor"],
    ["L.M",     "Management Labor"],
    ["M",       "Materials"],
    ["M.E",     "Major Equipment"],
    ["M.B",     "Bulk Materials"],
    ["S",       "Subcontracts"],
    ["S.C",     "Construction Subcontracts"],
    ["S.O",     "Other Services"],
    ["E",       "Expenses"],
    ["E.T",     "Travel & Per Diem"],
    ["E.O",     "Other Direct Costs"],
  ];
  return (
    <div className="max-w-[920px]">
      <SectionHeader
        title="Cost Breakdown Structure"
        sub="Categorization of cost by resource type (labor, material, subcontract, expense). Independent of WBS — every cost account has both a WBS and a CBS tag, enabling cross-cutting analysis."
        action="Add Code"
      />
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4 }}>
        <div className="grid grid-cols-[110px_1fr_120px] px-4 py-2.5 text-[10px] tracking-[0.12em] uppercase" style={{ background: "var(--surface-alt)", borderBottom: "1px solid var(--border)", color: "var(--ink-3)" }}>
          <div>Code</div>
          <div>Description</div>
          <div className="text-right">Accounts</div>
        </div>
        {cbs.map(([code, desc]) => {
          const lvl = code.split(".").length - 1;
          return (
            <div
              key={code}
              className="grid grid-cols-[110px_1fr_120px] px-4 py-2 items-center text-[12.5px]"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div className="num" style={{ color: "var(--ink-2)" }}>{code}</div>
              <div style={{ paddingLeft: lvl * 18, fontWeight: lvl === 0 ? 600 : 400 }}>{desc}</div>
              <div className="text-right num" style={{ color: "var(--ink-3)" }}>
                {Math.floor(20 + Math.random() * 200)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PeriodsEditor() {
  const periods = Array.from({ length: 36 }, (_, i) => {
    const month = ((i + 0) % 12) + 1;
    const year = 2022 + Math.floor((i + 0) / 12);
    return {
      code: `${year}-${String(month).padStart(2, "0")}`,
      year,
      month,
      status: i < 27 ? "closed" : i === 27 ? "current" : "future",
    };
  });
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="max-w-[920px]">
      <SectionHeader
        title="Reporting Periods"
        sub="Time buckets for time-phasing budget, actual, and earned value. Once closed, a period locks all data tagged to it — students must learn to close periods discipline."
        action="Add Year"
      />
      <div className="space-y-3">
        {[2022, 2023, 2024].map((year) => (
          <div key={year} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, padding: 14 }}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[13px] font-semibold">FY {year}</div>
              <div className="text-[11px]" style={{ color: "var(--ink-3)" }}>
                12 monthly periods
              </div>
            </div>
            <div className="grid grid-cols-12 gap-1.5">
              {months.map((m, idx) => {
                const p = periods.find((p) => p.year === year && p.month === idx + 1);
                const isClosed = p?.status === "closed";
                const isCurrent = p?.status === "current";
                return (
                  <div
                    key={idx}
                    className="text-center py-2 px-1 text-[11px]"
                    style={{
                      background: isCurrent ? "var(--accent-soft)" : isClosed ? "var(--surface-alt)" : "var(--surface)",
                      border: isCurrent ? "1px solid var(--accent)" : "1px solid var(--border)",
                      borderRadius: 3,
                    }}
                  >
                    <div style={{ color: "var(--ink-2)" }}>{m}</div>
                    <div className="mt-1 flex items-center justify-center" style={{ color: isClosed ? "var(--ink-muted)" : isCurrent ? "var(--accent)" : "var(--ink-3)" }}>
                      {isClosed ? <Lock size={10} /> : isCurrent ? <Circle size={10} fill="currentColor" /> : <Unlock size={10} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BaselinesEditor() {
  const baselines = [
    { name: "Original Baseline",    frozen: "2022-01-15", bac: 285_000, status: "frozen",   active: false, kind: "Baseline" },
    { name: "Approved Budget r1",   frozen: "2022-08-22", bac: 298_500, status: "frozen",   active: false, kind: "Approved" },
    { name: "Approved Budget r2",   frozen: "2023-03-10", bac: 305_000, status: "frozen",   active: true,  kind: "Approved" },
    { name: "Control Budget Q1-24", frozen: "2024-01-31", bac: 308_000, status: "frozen",   active: true,  kind: "Control" },
    { name: "Forecast (Q2 reset)",  frozen: "—",          bac: 312_500, status: "working",  active: true,  kind: "Forecast" },
  ];
  return (
    <div className="max-w-[920px]">
      <SectionHeader
        title="Baselines"
        sub="Frozen snapshots of the budget. Cost Control compares Current against the Active baselines in parallel — Baseline (original), Approved (board-approved), Control (working target), and Forecast (latest EAC)."
        action="Create Baseline"
      />
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4 }}>
        <div className="grid grid-cols-[1.4fr_120px_120px_140px_120px_80px] px-4 py-2.5 text-[10px] tracking-[0.12em] uppercase" style={{ background: "var(--surface-alt)", borderBottom: "1px solid var(--border)", color: "var(--ink-3)" }}>
          <div>Name</div>
          <div>Kind</div>
          <div>Frozen</div>
          <div className="text-right">BAC (kUSD)</div>
          <div>Status</div>
          <div className="text-right">Active</div>
        </div>
        {baselines.map((b) => (
          <div
            key={b.name}
            className="grid grid-cols-[1.4fr_120px_120px_140px_120px_80px] px-4 py-2.5 items-center text-[12.5px]"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div style={{ fontWeight: 500 }}>{b.name}</div>
            <div>
              <span
                className="px-1.5 py-0.5 text-[10px] tracking-wide uppercase"
                style={{
                  background: "var(--accent-soft)",
                  color: "var(--accent)",
                  borderRadius: 2,
                  fontWeight: 500,
                }}
              >
                {b.kind}
              </span>
            </div>
            <div className="num" style={{ color: "var(--ink-3)" }}>{b.frozen}</div>
            <div className="text-right num" style={{ fontWeight: 500 }}>{fmt(b.bac)}</div>
            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: b.status === "frozen" ? "var(--ink-2)" : "var(--ink-warning)" }}>
              {b.status === "frozen" ? <Lock size={11} /> : <AlertCircle size={11} />}
              <span className="capitalize">{b.status}</span>
            </div>
            <div className="text-right">
              {b.active ? (
                <CheckCircle2 size={15} style={{ color: "var(--ink-positive)" }} />
              ) : (
                <Minus size={15} style={{ color: "var(--ink-muted)" }} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionHeader({ title, sub, action }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h2 className="text-[18px] font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-[12.5px] max-w-[640px]" style={{ color: "var(--ink-3)" }}>
          {sub}
        </p>
      </div>
      <button
        className="px-3 py-1.5 text-[12px] flex items-center gap-2"
        style={{
          background: "var(--accent)",
          color: "#fff",
          borderRadius: 4,
          fontWeight: 500,
        }}
      >
        <Plus size={13} />
        {action}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Placeholder
// ─────────────────────────────────────────────────────────────

function PlaceholderScreen({ label }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="text-[11px] tracking-[0.18em] uppercase mb-2" style={{ color: "var(--ink-muted)" }}>
          Not in this prototype
        </div>
        <div className="text-[18px] font-medium" style={{ color: "var(--ink-2)" }}>{label}</div>
        <div className="mt-2 text-[12px]" style={{ color: "var(--ink-3)" }}>
          Mock the workflow with me when we're ready.
        </div>
      </div>
    </div>
  );
}
