// ===========================================================================
// CPM Training Clone — UI Prototype (single-file React)
// ===========================================================================
// What's REAL (keep these decisions):
//   - Visual language: IBM Plex Sans/Mono, petrol-teal accent, warm off-white
//   - Shell: dark sidebar for module nav, TopBar with period selector
//   - Cost Control: ribbon + tab bar + three-panel master-detail layout
//     (left WBS nav tree, top-right account data form, bottom detail tabs)
//   - EVM columns: BAC / EV / AC / Open Commit / ETC / EAC / CPI / VAC
//   - Project Setup tabs: WBS, CBS, Periods, Baselines
//
// What's MOCKED (replace with API data):
//   - RAW_WBS / buildModel() — replace with GET /projects/:id/cost-control
//   - All tab content data (groups, TP cost, budget lines, changes, commitments)
//   - Hardcoded project name, user footer, period list
//
// What's STUBBED:
//   - EVM Dashboard, Change Management, Procurement, Reports
//   - Edit modes (everything is read-only)
//   - Resizable panel splitters
// ===========================================================================

import React, { useState, useMemo } from "react";
import {
  LayoutGrid, Settings2, FileBarChart, GitBranch, Receipt, CalendarRange,
  ChevronRight, ChevronDown, ChevronLeft, ChevronsLeft, ChevronsRight,
  Search, ArrowUpDown, Filter, Download, Plus,
  Lock, Unlock, CheckCircle2, Circle, AlertCircle,
  TrendingUp, Minus, Trash2, Calculator, X,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
//  Mock data
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
    return { code, desc, level, isRoll, parent, bac, pct, cpi, earned, actual, openCommit, etc, eac, vac };
  });
}

const MODEL = buildModel();
const PROJECT_TOTAL = MODEL.filter(n => n.level === 0).reduce((s, n) => s + n.bac, 0);

// ─────────────────────────────────────────────────────────────
//  Utilities
// ─────────────────────────────────────────────────────────────

const fmt = (n, opts = {}) => {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const { decimals = 0 } = opts;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const pctFmt = (n) => (n * 100).toFixed(1) + "%";

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
        "--panel-header-bg": "#1B3A4B",
        "--panel-header-ink": "#E8E8DE",
        fontFamily: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        background: "var(--app-bg)",
        color: "var(--ink-1)",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        .num { font-family: "IBM Plex Mono", ui-monospace, monospace; font-variant-numeric: tabular-nums; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <Sidebar screen={screen} setScreen={setScreen} />

      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar period={period} setPeriod={setPeriod} screen={screen} />
        <div className="flex-1 overflow-hidden">
          {screen === "cost-control" && <CostControl period={period} />}
          {screen === "setup"        && <ProjectSetup />}
          {screen === "evm"          && <PlaceholderScreen label="EVM Dashboard" />}
          {screen === "changes"      && <PlaceholderScreen label="Change Management" />}
          {screen === "procurement"  && <PlaceholderScreen label="Procurement" />}
          {screen === "reports"      && <PlaceholderScreen label="Reports" />}
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
    { id: "setup",        label: "Project Setup",     icon: Settings2 },
    { id: "cost-control", label: "Cost Control",      icon: LayoutGrid },
    { id: "evm",          label: "EVM Dashboard",     icon: FileBarChart },
    { id: "changes",      label: "Change Management", icon: GitBranch },
    { id: "procurement",  label: "Procurement",       icon: Receipt },
    { id: "reports",      label: "Reports",           icon: CalendarRange },
  ];
  return (
    <aside
      className="w-[220px] flex-shrink-0 flex flex-col"
      style={{ background: "var(--sidebar-bg)", color: "var(--sidebar-ink)", borderRight: "1px solid var(--sidebar-border)" }}
    >
      <div className="px-5 py-5" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
        <div className="text-[10px] tracking-[0.18em] uppercase" style={{ color: "var(--sidebar-ink-muted)" }}>Project</div>
        <div className="mt-1 text-[15px] font-semibold leading-tight">PETROCHEM·EXP·2024</div>
        <div className="mt-2 flex items-center gap-2 text-[11px]" style={{ color: "var(--sidebar-ink-muted)" }}>
          <span>USD</span><span>·</span>
          <span>48 periods</span><span>·</span>
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
        <div className="mt-1">v0.2 · training build</div>
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
  const periods = ["2024-01","2024-02","2024-03","2024-04","2024-05","2024-06"];
  return (
    <header
      className="h-[48px] flex items-center justify-between px-6 flex-shrink-0"
      style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-3">
        <div className="text-[10px] tracking-[0.18em] uppercase" style={{ color: "var(--ink-3)" }}>Module</div>
        <div className="text-[14px] font-semibold">{labels[screen]}</div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 text-[12px]" style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", borderRadius: 3 }}>
          <CalendarRange size={13} style={{ color: "var(--ink-3)" }} />
          <span style={{ color: "var(--ink-3)" }}>Period</span>
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="bg-transparent border-0 font-medium num text-[12px] outline-none cursor-pointer"
            style={{ color: "var(--ink-1)" }}
          >
            {periods.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <button className="px-3 py-1.5 text-[12px] flex items-center gap-2" style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", borderRadius: 3, color: "var(--ink-2)" }}>
          <Download size={13} />Export
        </button>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────
//  Cost Control — three-panel master-detail
// ─────────────────────────────────────────────────────────────

function CostControl({ period }) {
  const [selectedCode, setSelectedCode] = useState("1.1");
  const [expanded, setExpanded] = useState(() => new Set(["1", "2", "2.1", "2.2", "3"]));
  const [bottomTab, setBottomTab] = useState("groups");
  const [search, setSearch] = useState("");

  const toggle = (code) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(code) ? next.delete(code) : next.add(code);
    return next;
  });

  const visible = useMemo(() => MODEL.filter(n => {
    if (n.parent) {
      let p = n.parent;
      while (p) {
        if (!expanded.has(p)) return false;
        p = MODEL.find(m => m.code === p)?.parent ?? null;
      }
    }
    if (!search) return true;
    const q = search.toLowerCase();
    return n.code.includes(q) || n.desc.toLowerCase().includes(q);
  }), [expanded, search]);

  const visibleIdx = visible.findIndex(n => n.code === selectedCode);
  const node = MODEL.find(n => n.code === selectedCode) ?? MODEL[0];

  const navigate = (delta) => {
    const next = visible[visibleIdx + delta];
    if (next) setSelectedCode(next.code);
  };

  return (
    <div className="h-full flex flex-col">
      <CostControlRibbon />
      <CostControlTabBar />
      <div className="flex-1 flex min-h-0">
        <WbsNavPanel
          visible={visible}
          selectedCode={selectedCode}
          visibleIdx={visibleIdx}
          search={search}
          setSearch={setSearch}
          expanded={expanded}
          onSelect={setSelectedCode}
          onToggle={toggle}
          onNavigate={navigate}
        />
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <AccountDataPanel node={node} period={period} />
          <AccountDetailTabs node={node} tab={bottomTab} setTab={setBottomTab} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Ribbon
// ─────────────────────────────────────────────────────────────

function CostControlRibbon() {
  const groups = [
    {
      label: "Data Entry",
      items: [
        { icon: Plus,       label: "Add" },
        { icon: Trash2,     label: "Delete" },
        { icon: Settings2,  label: "Settings" },
      ],
    },
    {
      label: "Calculations",
      items: [
        { icon: Calculator, label: "Calculate\nTotals" },
        { icon: ArrowUpDown,label: "Spread\nBudgets" },
        { icon: TrendingUp, label: "Spread\nETC/Earned" },
      ],
    },
    {
      label: "Reports",
      items: [
        { icon: FileBarChart, label: "Reports" },
        { icon: Download,     label: "Export" },
        { icon: Filter,       label: "Filter" },
      ],
    },
  ];

  return (
    <div
      className="flex items-stretch flex-shrink-0"
      style={{ background: "var(--surface)", borderBottom: "2px solid var(--border-strong)", minHeight: 62 }}
    >
      {groups.map((group, gi) => (
        <React.Fragment key={group.label}>
          <div className="flex flex-col">
            <div className="flex items-start gap-0.5 px-3 pt-2 pb-1 flex-1">
              {group.items.map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  className="flex flex-col items-center gap-1 px-2.5 py-1.5 transition-colors"
                  style={{
                    minWidth: 50,
                    borderRadius: 2,
                    background: "transparent",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--surface-hover)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <Icon size={18} strokeWidth={1.5} style={{ color: "var(--accent)" }} />
                  <span
                    className="text-[9.5px] text-center leading-tight"
                    style={{ color: "var(--ink-2)", whiteSpace: "pre-line" }}
                  >
                    {label}
                  </span>
                </button>
              ))}
            </div>
            <div className="text-[8.5px] tracking-[0.14em] uppercase text-center pb-1.5" style={{ color: "var(--ink-muted)" }}>
              {group.label}
            </div>
          </div>
          {gi < groups.length - 1 && (
            <div className="w-px my-2 mx-1 flex-shrink-0" style={{ background: "var(--border)" }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Tab bar
// ─────────────────────────────────────────────────────────────

function CostControlTabBar() {
  return (
    <div
      className="flex items-end flex-shrink-0 px-3 gap-1"
      style={{ background: "var(--surface-alt)", borderBottom: "1px solid var(--border-strong)" }}
    >
      <div
        className="flex items-center gap-2 px-3 py-1.5 text-[11.5px] font-medium"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border-strong)",
          borderBottom: "1px solid var(--surface)",
          borderRadius: "2px 2px 0 0",
          color: "var(--ink-1)",
          marginBottom: -1,
        }}
      >
        <LayoutGrid size={11} style={{ color: "var(--accent)" }} />
        Control Accounts
        <button className="opacity-30 hover:opacity-80 ml-1" style={{ color: "var(--ink-2)" }}>
          <X size={11} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Left nav panel — WBS tree
// ─────────────────────────────────────────────────────────────

function NavButton({ onClick, disabled, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center"
      style={{
        width: 22, height: 22,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 2,
        color: disabled ? "var(--ink-muted)" : "var(--ink-2)",
        cursor: disabled ? "default" : "pointer",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function WbsNavPanel({ visible, selectedCode, visibleIdx, search, setSearch, expanded, onSelect, onToggle, onNavigate }) {
  const btnBase = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 2,
    color: "var(--ink-2)",
    fontSize: 11,
    padding: "2px 7px",
    display: "flex",
    alignItems: "center",
    gap: 3,
    cursor: "pointer",
  };

  return (
    <div
      className="flex-shrink-0 flex flex-col border-r overflow-hidden"
      style={{ width: 310, background: "var(--surface)" }}
    >
      {/* Panel header */}
      <div
        className="px-3 py-1.5 text-[11px] font-semibold tracking-wide flex-shrink-0"
        style={{ background: "var(--panel-header-bg)", color: "var(--panel-header-ink)" }}
      >
        Control Accounts — Navigation
      </div>

      {/* Nav controls */}
      <div
        className="flex items-center gap-1 px-2 py-1.5 flex-shrink-0 flex-wrap"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-alt)" }}
      >
        <span className="num text-[10.5px] mr-1 flex-shrink-0" style={{ color: "var(--ink-3)" }}>
          {visibleIdx + 1} of {MODEL.length}
        </span>
        <NavButton onClick={() => onNavigate(-visibleIdx)} disabled={visibleIdx <= 0}>
          <ChevronsLeft size={11} />
        </NavButton>
        <NavButton onClick={() => onNavigate(-1)} disabled={visibleIdx <= 0}>
          <ChevronLeft size={11} />
        </NavButton>
        <NavButton onClick={() => onNavigate(1)} disabled={visibleIdx >= visible.length - 1}>
          <ChevronRight size={11} />
        </NavButton>
        <NavButton onClick={() => onNavigate(visible.length - 1 - visibleIdx)} disabled={visibleIdx >= visible.length - 1}>
          <ChevronsRight size={11} />
        </NavButton>
        <div className="flex-1" />
        <button style={btnBase}><Plus size={10} />Add</button>
        <button style={btnBase}><Trash2 size={10} />Delete</button>
        <button style={{ ...btnBase, padding: "2px 6px" }}><Filter size={10} /></button>
      </div>

      {/* Search */}
      <div className="px-2 py-1.5 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <div
          className="flex items-center gap-2 px-2 py-1"
          style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", borderRadius: 2 }}
        >
          <Search size={11} style={{ color: "var(--ink-muted)" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search accounts…"
            className="bg-transparent border-0 outline-none flex-1 text-[11px]"
            style={{ color: "var(--ink-1)" }}
          />
        </div>
      </div>

      {/* Column headers */}
      <div
        className="grid px-2 py-1 flex-shrink-0"
        style={{
          gridTemplateColumns: "90px 1fr",
          background: "var(--surface-alt)",
          borderBottom: "1px solid var(--border-strong)",
          fontSize: 9.5,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: "var(--ink-3)",
        }}
      >
        <div>Account ID</div>
        <div>Description</div>
      </div>

      {/* Tree rows */}
      <div className="flex-1 overflow-y-auto">
        {visible.map(n => (
          <WbsNavRow
            key={n.code}
            node={n}
            isSelected={n.code === selectedCode}
            isExpanded={expanded.has(n.code)}
            onSelect={() => onSelect(n.code)}
            onToggle={() => onToggle(n.code)}
          />
        ))}
      </div>
    </div>
  );
}

function WbsNavRow({ node, isSelected, isExpanded, onSelect, onToggle }) {
  return (
    <div
      onClick={onSelect}
      className="grid items-center cursor-pointer"
      style={{
        gridTemplateColumns: "90px 1fr",
        borderBottom: "1px solid var(--border)",
        background: isSelected
          ? "var(--accent-soft)"
          : node.level === 0 ? "#F0F0E8"
          : "transparent",
        borderLeft: isSelected ? "2px solid var(--accent)" : "2px solid transparent",
      }}
    >
      <div
        className="px-2 py-1.5 num"
        style={{
          fontSize: 11,
          color: isSelected ? "var(--accent)" : "var(--ink-2)",
          fontWeight: node.level === 0 ? 600 : 400,
        }}
      >
        {node.code}
      </div>
      <div
        className="py-1.5 pr-2 flex items-center"
        style={{ paddingLeft: node.level * 10 + 4 }}
      >
        {node.isRoll ? (
          <button
            onClick={e => { e.stopPropagation(); onToggle(); }}
            className="mr-1 flex-shrink-0"
            style={{ color: "var(--ink-3)" }}
          >
            {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          </button>
        ) : (
          <span className="mr-1 flex-shrink-0" style={{ width: 14 }} />
        )}
        <span style={{
          fontSize: 11,
          color: isSelected ? "var(--accent)" : "var(--ink-1)",
          fontWeight: node.level === 0 ? 600 : node.isRoll ? 500 : 400,
        }}>
          {node.desc}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Account data panel (top-right)
// ─────────────────────────────────────────────────────────────

function AccountDataPanel({ node, period }) {
  if (!node) return (
    <div className="flex items-center justify-center" style={{ height: 300, color: "var(--ink-muted)", fontSize: 12 }}>
      Select a control account
    </div>
  );

  const baselineBudget  = node.bac * 0.92;
  const approvedChanges = node.bac * 0.08;
  const periodIncurred  = node.actual * 0.06;
  const openCommit      = node.openCommit;

  const labelSt = { fontSize: 9.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em" };
  const fieldSt = {
    background: "var(--surface)",
    border: "1px solid var(--border-strong)",
    borderRadius: 2,
    padding: "2px 7px",
    fontSize: 11.5,
    color: "var(--ink-1)",
    marginTop: 2,
    minHeight: 24,
    display: "flex",
    alignItems: "center",
  };
  const monoField = { ...fieldSt, fontFamily: '"IBM Plex Mono", monospace' };

  return (
    <div
      className="flex-shrink-0 overflow-y-auto"
      style={{ height: 300, borderBottom: "2px solid var(--border-strong)", background: "var(--app-bg)" }}
    >
      {/* Panel header */}
      <div
        className="px-3 py-1.5 text-[11px] font-semibold tracking-wide"
        style={{ background: "var(--panel-header-bg)", color: "var(--panel-header-ink)" }}
      >
        Control Accounts — Data
      </div>

      <div className="p-3 space-y-2.5">
        {/* Row 1: Account ID + Currency */}
        <div className="flex gap-3">
          <div style={{ flex: 1 }}>
            <div style={labelSt}>Account ID</div>
            <div style={{ ...monoField, color: "var(--accent)", fontWeight: 600 }}>{node.code}</div>
          </div>
          <div style={{ width: 80 }}>
            <div style={labelSt}>Currency ID</div>
            <div style={monoField}>USD</div>
          </div>
        </div>

        {/* Row 2: Description */}
        <div>
          <div style={labelSt}>Description</div>
          <div style={fieldSt}>{node.desc}</div>
        </div>

        {/* Row 3: Master Account / Vendor / Labor Rate */}
        <div className="flex gap-3">
          {[["Master Account ID", "—"], ["Vendor ID", "—"], ["Labor Rate Type", "—"]].map(([label, val]) => (
            <div key={label} style={{ flex: 1 }}>
              <div style={labelSt}>{label}</div>
              <div style={{ ...fieldSt, color: "var(--ink-muted)" }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Control Account Totals */}
        <div>
          <div
            className="px-3 py-1 text-[11px] font-semibold"
            style={{ background: "#E0E0D6", borderRadius: "2px 2px 0 0", color: "var(--ink-1)" }}
          >
            Control Account Totals
          </div>
          <div style={{ border: "1px solid var(--border-strong)", borderTop: "none", borderRadius: "0 0 2px 2px", overflow: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 860 }}>
              <thead>
                <tr style={{ background: "var(--surface-alt)", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ width: 55, padding: "4px 8px", textAlign: "left", fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)" }}></th>
                  {["Baseline Budget","Approved Changes","Approved Budget","Period Incurred","Incurred To Date","Open Commitment","Est. To Complete","Est. At Completion"].map(h => (
                    <th key={h} style={{ padding: "4px 8px", textAlign: "right", fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Hours row */}
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "4px 8px", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-3)" }}>Hours</td>
                  {[
                    node.bac * 0.028,
                    node.bac * 0.003,
                    node.bac * 0.031,
                    node.actual * 0.06 * 0.03,
                    node.actual * 0.03,
                    0,
                    node.etc * 0.03,
                    node.eac * 0.03,
                  ].map((v, i) => (
                    <td key={i} className="num" style={{ padding: "4px 8px", textAlign: "right", fontSize: 11 }}>
                      {v === 0 ? "—" : fmt(v)}
                    </td>
                  ))}
                </tr>
                {/* Cost row */}
                <tr>
                  <td style={{ padding: "4px 8px", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-3)" }}>Cost</td>
                  {[
                    baselineBudget,
                    approvedChanges,
                    node.bac,
                    periodIncurred,
                    node.actual,
                    openCommit,
                    node.etc,
                    node.eac,
                  ].map((v, i) => (
                    <td key={i} className="num" style={{ padding: "4px 8px", textAlign: "right", fontSize: 11, fontWeight: i === 7 ? 600 : 400 }}>
                      {fmt(v)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom row: % Complete + Schedule Dates + Curves */}
        <div className="flex gap-3">
          {/* Percent Complete */}
          <div style={{ flexShrink: 0, width: 150 }}>
            <div className="px-2 py-1 text-[10px] font-semibold" style={{ background: "#E0E0D6", borderRadius: "2px 2px 0 0" }}>Percent Complete</div>
            <div style={{ border: "1px solid var(--border-strong)", borderTop: "none", borderRadius: "0 0 2px 2px", padding: "6px 8px" }}>
              {[["Current", pctFmt(node.pct), "var(--accent)"], ["Previous", pctFmt(Math.max(0, node.pct - 0.04)), null], ["Method", "MAN", null]].map(([k, v, color]) => (
                <div key={k} className="flex justify-between items-center py-0.5">
                  <span style={{ fontSize: 9.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{k}</span>
                  <span className="num" style={{ fontSize: 11, fontWeight: k === "Current" ? 600 : 400, color: color ?? "var(--ink-1)" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule Dates */}
          <div style={{ flex: 1 }}>
            <div className="px-2 py-1 text-[10px] font-semibold" style={{ background: "#E0E0D6", borderRadius: "2px 2px 0 0" }}>Schedule Dates</div>
            <div style={{ border: "1px solid var(--border-strong)", borderTop: "none", borderRadius: "0 0 2px 2px", padding: "6px 8px" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 10 }}>
                <thead>
                  <tr>
                    <td style={{ width: 72 }}></td>
                    {["Early Start","Early Finish","Late Start","Late Finish"].map(h => (
                      <td key={h} style={{ textAlign: "center", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", paddingBottom: 2 }}>{h}</td>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Baseline", "2022-01", "2024-06", "2022-03", "2024-09"],
                    ["Approved",  "2022-01", "2024-08", "2022-03", "2024-11"],
                    ["Control",   "2022-01", "2024-10", "2022-03", "2025-01"],
                    ["Current",   "2022-02", "—",       "—",       "—"],
                  ].map(([label, ...dates]) => (
                    <tr key={label}>
                      <td style={{ fontSize: 9.5, color: "var(--ink-3)", paddingRight: 6, paddingTop: 2 }}>{label}</td>
                      {dates.map((d, i) => (
                        <td key={i} className="num" style={{ textAlign: "center", fontSize: 10, paddingTop: 2 }}>{d}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Curves */}
          <div style={{ flexShrink: 0, width: 175 }}>
            <div className="px-2 py-1 text-[10px] font-semibold" style={{ background: "#E0E0D6", borderRadius: "2px 2px 0 0" }}>Time Phased Data Curves</div>
            <div style={{ border: "1px solid var(--border-strong)", borderTop: "none", borderRadius: "0 0 2px 2px", padding: "6px 8px" }}>
              {["Baseline Budget","Approved Budget","Control Budget","Est. To Complete"].map(label => (
                <div key={label} className="flex justify-between items-center py-0.5">
                  <span style={{ fontSize: 9.5, color: "var(--ink-3)" }}>{label}</span>
                  <span className="num" style={{ fontSize: 10, color: "var(--accent)" }}>S-CURVE</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Bottom detail tabs
// ─────────────────────────────────────────────────────────────

const BOTTOM_TABS = [
  { id: "groups",      label: "Groups / Breakdown Structures" },
  { id: "cost",        label: "TP Cost" },
  { id: "budget",      label: "Budget Details" },
  { id: "changes",     label: "Changes" },
  { id: "commitments", label: "Commitments" },
];

function AccountDetailTabs({ node, tab, setTab }) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Tab strip */}
      <div
        className="flex items-end flex-shrink-0 px-2"
        style={{ background: "var(--surface-alt)", borderBottom: "1px solid var(--border-strong)" }}
      >
        {BOTTOM_TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              padding: "5px 12px",
              fontSize: 11,
              background: tab === id ? "var(--surface)" : "transparent",
              color: tab === id ? "var(--ink-1)" : "var(--ink-3)",
              fontWeight: tab === id ? 500 : 400,
              border: "1px solid",
              borderColor: tab === id ? "var(--border-strong)" : "transparent",
              borderBottom: tab === id ? "1px solid var(--surface)" : "1px solid transparent",
              borderRadius: "2px 2px 0 0",
              marginBottom: tab === id ? -1 : 0,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3" style={{ background: "var(--surface)" }}>
        {!node ? (
          <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>No account selected</div>
        ) : tab === "groups" ? (
          <GroupsTab node={node} />
        ) : tab === "cost" ? (
          <TpCostTab node={node} />
        ) : tab === "budget" ? (
          <BudgetDetailsTab node={node} />
        ) : tab === "changes" ? (
          <ChangesTab node={node} />
        ) : tab === "commitments" ? (
          <CommitmentsTab node={node} />
        ) : null}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Tab content components
// ─────────────────────────────────────────────────────────────

function TinyTable({ headers, rows, rightCols = [] }) {
  return (
    <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 11 }}>
      <thead>
        <tr style={{ background: "var(--surface-alt)", borderBottom: "1px solid var(--border-strong)" }}>
          {headers.map((h, i) => (
            <th key={h} style={{ padding: "5px 10px", textAlign: rightCols.includes(i) ? "right" : "left", fontSize: 9.5, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--ink-3)", whiteSpace: "nowrap" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} style={{ borderBottom: "1px solid var(--border)" }}>
            {row.map((cell, ci) => (
              <td key={ci} className={typeof cell === "number" ? "num" : ""} style={{ padding: "5px 10px", textAlign: rightCols.includes(ci) ? "right" : "left", color: ci === 0 && typeof cell === "string" && cell.startsWith("C") ? "var(--accent)" : "inherit" }}>
                {typeof cell === "number" ? fmt(cell) : cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function GroupsTab({ node }) {
  const cbsByLevel0 = { "1": ["L.E","Engineering Labor"], "2": ["M.E","Major Equipment"], "3": ["L.C","Construction Labor"], "4": ["S.C","Construction Subcontracts"], "5": ["E.O","Other Direct Costs"], "6": ["E.O","Other Direct Costs"] };
  const [cbsCode, cbsDesc] = cbsByLevel0[node.code.split(".")[0]] ?? ["M.B","Bulk Materials"];

  const rows = [
    ["Cost Breakdown Structure", "CBS",    cbsCode,      cbsDesc],
    ["Work Breakdown Structure", "WBS",    node.code,    node.desc],
    ["Prime",                   "Module", node.level === 0 ? node.code : (node.parent ?? node.code), ""],
    ["Package",                 "Module", "PKG-001",    "Main Works Package"],
    ["Package Type",            "Module", "2",          "2. Procurement"],
    ["Cost Controller",         "Module", "01",         "F. Vera"],
    ["Package Status",          "Module", "2",          "2-AWARDED"],
    ["WBS (Control Account)",   "Module", node.code,    node.desc],
  ];

  return (
    <div style={{ maxWidth: 740 }}>
      <TinyTable
        headers={["Title", "Type", "ID", "Description"]}
        rows={rows}
      />
    </div>
  );
}

function TpCostTab({ node }) {
  const PERIODS = Array.from({ length: 12 }, (_, i) => `2023-${String(i + 1).padStart(2, "0")}`);

  const bell = Array.from({ length: 12 }, (_, i) => {
    const x = (i + 0.5) / 12;
    return Math.exp(-Math.pow(x - 0.45, 2) / (2 * 0.18 * 0.18));
  });
  const bellSum = bell.reduce((s, v) => s + v, 0);
  const weights = bell.map(v => v / bellSum);

  const filledPeriods = Math.min(12, Math.ceil(12 * node.pct * 0.85));
  const filledSum = weights.slice(0, filledPeriods).reduce((s, v) => s + v, 0) || 1;

  const budgetVals  = weights.map(w => w * node.bac);
  const actualVals  = weights.map((w, i) => i < filledPeriods ? (w / filledSum) * node.actual : 0);
  const earnedVals  = weights.map((w, i) => i < filledPeriods ? (w / filledSum) * node.earned : 0);

  const tableRows = [
    { label: "Budget (Baseline)", values: budgetVals, color: null },
    { label: "Actual (AC)",       values: actualVals, color: "var(--ink-negative)" },
    { label: "Earned (EV)",       values: earnedVals, color: "var(--ink-positive)" },
  ];

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", fontSize: 11, minWidth: 900 }}>
        <thead>
          <tr style={{ background: "var(--surface-alt)", borderBottom: "1px solid var(--border-strong)" }}>
            <th style={{ width: 140, padding: "5px 10px", textAlign: "left", position: "sticky", left: 0, background: "var(--surface-alt)", fontSize: 9.5, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--ink-3)" }}></th>
            {PERIODS.map(p => (
              <th key={p} className="num" style={{ padding: "5px 8px", textAlign: "right", fontSize: 9.5, color: "var(--ink-3)", whiteSpace: "nowrap" }}>{p}</th>
            ))}
            <th className="num" style={{ padding: "5px 10px", textAlign: "right", fontSize: 9.5, color: "var(--ink-3)", background: "var(--surface-alt)", position: "sticky", right: 0 }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {tableRows.map(({ label, values, color }) => (
            <tr key={label} style={{ borderBottom: "1px solid var(--border)" }}>
              <td style={{ padding: "5px 10px", position: "sticky", left: 0, background: "var(--surface)", fontSize: 11 }}>{label}</td>
              {values.map((v, i) => (
                <td key={i} className="num" style={{ padding: "5px 8px", textAlign: "right", fontSize: 11, color: v === 0 ? "var(--ink-muted)" : color ?? "var(--ink-1)" }}>
                  {v < 1 ? "—" : fmt(v)}
                </td>
              ))}
              <td className="num" style={{ padding: "5px 10px", textAlign: "right", fontWeight: 600, fontSize: 11, color: color ?? "var(--ink-1)", position: "sticky", right: 0, background: "var(--surface)" }}>
                {fmt(values.reduce((s, v) => s + v, 0))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: 10, color: "var(--ink-muted)", marginTop: 6 }}>Showing FY 2023 · 12 of 36 periods</div>
    </div>
  );
}

function BudgetDetailsTab({ node }) {
  const lines = [
    ["Direct labor — engineering",     240, "MH",  85,         240,          20400],
    ["Materials supply",               1,   "LS",  null,       null,         node.bac * 0.60],
    ["Subcontract installation",       1,   "LS",  null,       node.bac * 0.01, node.bac * 0.25],
    ["Project management overhead",    1,   "LS",  null,       80,           node.bac * 0.08],
    ["Contingency allowance",          1,   "LS",  null,       null,         node.bac * 0.05],
  ].slice(0, node.isRoll ? 3 : 5);

  const totalCost = lines.reduce((s, l) => s + l[5], 0);

  return (
    <div>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 11 }}>
        <thead>
          <tr style={{ background: "var(--surface-alt)", borderBottom: "1px solid var(--border-strong)" }}>
            {["Description","Quantity","Unit","Rate","Hours","Cost"].map((h, i) => (
              <th key={h} style={{ padding: "5px 10px", textAlign: i > 2 ? "right" : "left", fontSize: 9.5, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--ink-3)" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map(([desc, qty, unit, rate, hours, cost], i) => (
            <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
              <td style={{ padding: "5px 10px" }}>{desc}</td>
              <td className="num" style={{ padding: "5px 10px", textAlign: "right" }}>{qty.toLocaleString()}</td>
              <td style={{ padding: "5px 10px" }}>{unit}</td>
              <td className="num" style={{ padding: "5px 10px", textAlign: "right" }}>{rate ? fmt(rate) : "—"}</td>
              <td className="num" style={{ padding: "5px 10px", textAlign: "right" }}>{hours ? fmt(hours) : "—"}</td>
              <td className="num" style={{ padding: "5px 10px", textAlign: "right", fontWeight: 500 }}>{fmt(cost)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: "var(--surface-alt)", borderTop: "1px solid var(--border-strong)" }}>
            <td colSpan={5} style={{ padding: "5px 10px", fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.10em", color: "var(--ink-3)" }}>Total</td>
            <td className="num" style={{ padding: "5px 10px", textAlign: "right", fontWeight: 600 }}>{fmt(totalCost)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function ChangesTab({ node }) {
  const statusColor = s => s === "approved" ? "var(--ink-positive)" : s === "trend" ? "var(--ink-warning)" : "var(--ink-negative)";
  const changes = [
    { code: "CO-001", desc: "Additional scope — site conditions",    status: "approved", impact: node.bac * 0.04, date: "2023-03-15" },
    { code: "CO-007", desc: "Design revision — material upgrade",    status: "approved", impact: node.bac * 0.02, date: "2023-08-22" },
    { code: "CO-015", desc: "Schedule acceleration premium",         status: "trend",    impact: node.bac * 0.015, date: "2024-01-10" },
  ].slice(0, node.isRoll ? 2 : 3);

  return (
    <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 11 }}>
      <thead>
        <tr style={{ background: "var(--surface-alt)", borderBottom: "1px solid var(--border-strong)" }}>
          {["Change Code","Description","Status","Cost Impact","Date"].map((h, i) => (
            <th key={h} style={{ padding: "5px 10px", textAlign: i >= 3 ? "right" : "left", fontSize: 9.5, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--ink-3)" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {changes.map(c => (
          <tr key={c.code} style={{ borderBottom: "1px solid var(--border)" }}>
            <td className="num" style={{ padding: "5px 10px", fontWeight: 600, color: "var(--accent)" }}>{c.code}</td>
            <td style={{ padding: "5px 10px" }}>{c.desc}</td>
            <td style={{ padding: "5px 10px", fontWeight: 500, color: statusColor(c.status), textTransform: "capitalize" }}>{c.status}</td>
            <td className="num" style={{ padding: "5px 10px", textAlign: "right" }}>{fmt(c.impact)}</td>
            <td className="num" style={{ padding: "5px 10px", textAlign: "right", color: "var(--ink-3)" }}>{c.date}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CommitmentsTab({ node }) {
  const commitments = [
    { contract: "CTR-0042", vendor: "Fluor Engineering",  item: 1, period: "2022-03", cost: node.bac * 0.45, pending: false },
    { contract: "CTR-0108", vendor: "Bechtel Supply Co.", item: 2, period: "2022-08", cost: node.bac * 0.30, pending: false },
    { contract: "CTR-0201", vendor: "KBR Construction",   item: 1, period: "2023-01", cost: node.bac * 0.15, pending: true  },
  ].slice(0, node.isRoll ? 2 : 3);

  return (
    <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 11 }}>
      <thead>
        <tr style={{ background: "var(--surface-alt)", borderBottom: "1px solid var(--border-strong)" }}>
          {["Contract","Vendor","Item","Period","Cost","Status"].map((h, i) => (
            <th key={h} style={{ padding: "5px 10px", textAlign: i >= 4 ? "right" : "left", fontSize: 9.5, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--ink-3)" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {commitments.map((c, i) => (
          <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
            <td className="num" style={{ padding: "5px 10px", fontWeight: 600, color: "var(--accent)" }}>{c.contract}</td>
            <td style={{ padding: "5px 10px" }}>{c.vendor}</td>
            <td className="num" style={{ padding: "5px 10px" }}>{c.item}</td>
            <td className="num" style={{ padding: "5px 10px", color: "var(--ink-3)" }}>{c.period}</td>
            <td className="num" style={{ padding: "5px 10px", textAlign: "right", fontWeight: 500 }}>{fmt(c.cost)}</td>
            <td style={{ padding: "5px 10px", textAlign: "right" }}>
              {c.pending
                ? <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 2, background: "#9A5B12", color: "#fff" }}>Pending</span>
                : <CheckCircle2 size={13} style={{ color: "var(--ink-positive)", marginLeft: "auto", display: "block" }} />
              }
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─────────────────────────────────────────────────────────────
//  Project Setup Screen (unchanged from v1)
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
      <div className="px-6 flex-shrink-0" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
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
        {tab === "wbs"       && <WbsEditor />}
        {tab === "cbs"       && <CbsEditor />}
        {tab === "periods"   && <PeriodsEditor />}
        {tab === "baselines" && <BaselinesEditor />}
      </div>
    </div>
  );
}

function WbsEditor() {
  return (
    <div className="max-w-[920px]">
      <SectionHeader title="Work Breakdown Structure" sub="Hierarchy of deliverables. Codes are dotted (e.g. 1.2.3). Cost accounts are tagged to a WBS node." action="Add Node" />
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4 }}>
        <div className="grid grid-cols-[110px_1fr_140px_80px] px-4 py-2.5 text-[10px] tracking-[0.12em] uppercase" style={{ background: "var(--surface-alt)", borderBottom: "1px solid var(--border)", color: "var(--ink-3)" }}>
          <div>Code</div><div>Description</div><div className="text-right">Accounts</div><div className="text-right">Level</div>
        </div>
        {MODEL.filter(n => n.level < 2).map(n => (
          <div key={n.code} className="grid grid-cols-[110px_1fr_140px_80px] px-4 py-2 items-center text-[12.5px]" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="num" style={{ color: "var(--ink-2)" }}>{n.code}</div>
            <div style={{ paddingLeft: n.level * 18, fontWeight: n.level === 0 ? 600 : 400 }}>{n.desc}</div>
            <div className="text-right num" style={{ color: "var(--ink-3)" }}>{Math.floor(8 + Math.random() * 40)}</div>
            <div className="text-right num" style={{ color: "var(--ink-3)" }}>{n.level + 1}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CbsEditor() {
  const cbs = [
    ["L","Labor"],["L.E","Engineering Labor"],["L.C","Construction Labor"],["L.M","Management Labor"],
    ["M","Materials"],["M.E","Major Equipment"],["M.B","Bulk Materials"],
    ["S","Subcontracts"],["S.C","Construction Subcontracts"],["S.O","Other Services"],
    ["E","Expenses"],["E.T","Travel & Per Diem"],["E.O","Other Direct Costs"],
  ];
  return (
    <div className="max-w-[920px]">
      <SectionHeader title="Cost Breakdown Structure" sub="Categorization by resource type. Every cost account has both a WBS and a CBS tag." action="Add Code" />
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4 }}>
        <div className="grid grid-cols-[110px_1fr_120px] px-4 py-2.5 text-[10px] tracking-[0.12em] uppercase" style={{ background: "var(--surface-alt)", borderBottom: "1px solid var(--border)", color: "var(--ink-3)" }}>
          <div>Code</div><div>Description</div><div className="text-right">Accounts</div>
        </div>
        {cbs.map(([code, desc]) => {
          const lvl = code.split(".").length - 1;
          return (
            <div key={code} className="grid grid-cols-[110px_1fr_120px] px-4 py-2 items-center text-[12.5px]" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="num" style={{ color: "var(--ink-2)" }}>{code}</div>
              <div style={{ paddingLeft: lvl * 18, fontWeight: lvl === 0 ? 600 : 400 }}>{desc}</div>
              <div className="text-right num" style={{ color: "var(--ink-3)" }}>{Math.floor(20 + Math.random() * 200)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PeriodsEditor() {
  const periods = Array.from({ length: 36 }, (_, i) => {
    const month = (i % 12) + 1;
    const year = 2022 + Math.floor(i / 12);
    return { code: `${year}-${String(month).padStart(2, "0")}`, year, month, status: i < 27 ? "closed" : i === 27 ? "current" : "future" };
  });
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div className="max-w-[920px]">
      <SectionHeader title="Reporting Periods" sub="Time buckets for time-phasing. Once closed, a period locks all data tagged to it." action="Add Year" />
      <div className="space-y-3">
        {[2022, 2023, 2024].map(year => (
          <div key={year} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, padding: 14 }}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[13px] font-semibold">FY {year}</div>
              <div className="text-[11px]" style={{ color: "var(--ink-3)" }}>12 monthly periods</div>
            </div>
            <div className="grid grid-cols-12 gap-1.5">
              {months.map((m, idx) => {
                const p = periods.find(p => p.year === year && p.month === idx + 1);
                const isClosed = p?.status === "closed";
                const isCurrent = p?.status === "current";
                return (
                  <div key={idx} className="text-center py-2 px-1 text-[11px]" style={{ background: isCurrent ? "var(--accent-soft)" : isClosed ? "var(--surface-alt)" : "var(--surface)", border: isCurrent ? "1px solid var(--accent)" : "1px solid var(--border)", borderRadius: 3 }}>
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
    { name: "Original Baseline",    frozen: "2022-01-15", bac: 285_000, status: "frozen",  active: false, kind: "Baseline" },
    { name: "Approved Budget r1",   frozen: "2022-08-22", bac: 298_500, status: "frozen",  active: false, kind: "Approved" },
    { name: "Approved Budget r2",   frozen: "2023-03-10", bac: 305_000, status: "frozen",  active: true,  kind: "Approved" },
    { name: "Control Budget Q1-24", frozen: "2024-01-31", bac: 308_000, status: "frozen",  active: true,  kind: "Control" },
    { name: "Forecast (Q2 reset)",  frozen: "—",          bac: 312_500, status: "working", active: true,  kind: "Forecast" },
  ];
  return (
    <div className="max-w-[920px]">
      <SectionHeader title="Baselines" sub="Frozen snapshots of the budget. Cost Control compares current against active baselines in parallel — Baseline, Approved, Control, Forecast." action="Create Baseline" />
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4 }}>
        <div className="grid grid-cols-[1.4fr_120px_120px_140px_120px_80px] px-4 py-2.5 text-[10px] tracking-[0.12em] uppercase" style={{ background: "var(--surface-alt)", borderBottom: "1px solid var(--border)", color: "var(--ink-3)" }}>
          <div>Name</div><div>Kind</div><div>Frozen</div><div className="text-right">BAC (kUSD)</div><div>Status</div><div className="text-right">Active</div>
        </div>
        {baselines.map(b => (
          <div key={b.name} className="grid grid-cols-[1.4fr_120px_120px_140px_120px_80px] px-4 py-2.5 items-center text-[12.5px]" style={{ borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 500 }}>{b.name}</div>
            <div><span className="px-1.5 py-0.5 text-[10px] tracking-wide uppercase" style={{ background: "var(--accent-soft)", color: "var(--accent)", borderRadius: 2, fontWeight: 500 }}>{b.kind}</span></div>
            <div className="num" style={{ color: "var(--ink-3)" }}>{b.frozen}</div>
            <div className="text-right num" style={{ fontWeight: 500 }}>{fmt(b.bac)}</div>
            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: b.status === "frozen" ? "var(--ink-2)" : "var(--ink-warning)" }}>
              {b.status === "frozen" ? <Lock size={11} /> : <AlertCircle size={11} />}
              <span className="capitalize">{b.status}</span>
            </div>
            <div className="text-right">
              {b.active ? <CheckCircle2 size={15} style={{ color: "var(--ink-positive)" }} /> : <Minus size={15} style={{ color: "var(--ink-muted)" }} />}
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
        <p className="mt-1 text-[12.5px] max-w-[640px]" style={{ color: "var(--ink-3)" }}>{sub}</p>
      </div>
      <button className="px-3 py-1.5 text-[12px] flex items-center gap-2" style={{ background: "var(--accent)", color: "#fff", borderRadius: 4, fontWeight: 500 }}>
        <Plus size={13} />{action}
      </button>
    </div>
  );
}

function PlaceholderScreen({ label }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="text-[11px] tracking-[0.18em] uppercase mb-2" style={{ color: "var(--ink-muted)" }}>Not in this prototype</div>
        <div className="text-[18px] font-medium" style={{ color: "var(--ink-2)" }}>{label}</div>
        <div className="mt-2 text-[12px]" style={{ color: "var(--ink-3)" }}>Mock the workflow with me when we're ready.</div>
      </div>
    </div>
  );
}
