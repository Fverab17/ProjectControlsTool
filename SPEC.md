# CPM Training Clone — Project Spec

> **Read this file first.** It's the handoff from a planning session in Claude.ai
> to the dev environment. It captures every decision made so far so the build
> can pick up where the planning left off.

## 1. Context

A vocational training tool that mirrors the workflows of a commercial capital
project management platform (the kind used to run multi-hundred-million-dollar
EPC projects in oil & gas, mining, energy, and large infrastructure). The
commercial tool is expensive, license-gated, and we can't put students on it
directly, so we're building our own with the same conceptual model and
workflows. The goal is **skill transfer**: a student who masters this tool
should be able to sit down at the real one and be productive within a day.

This is **educational software for ~30 concurrent users** (a single class), not
a commercial product. Performance and polish are secondary to conceptual
correctness and workflow fidelity.

## 2. What this is — and isn't

It **is** a training environment that replicates the **domain model and
workflows** of professional cost/schedule control software (WBS hierarchies,
cost accounts, time-phased budgets, commitments, actuals, earned value, change
management). It is **interoperable** with the real tool via import of its
archive format (see §8).

It is **not** a clone of the commercial tool's source code, schema, UI, or
branding. We use our own names, our own visual design, our own implementation.
Concepts and workflows are not copyrightable; specific table names, column
names, and visual layouts are. Stay on the right side of that line. (See §3.)

## 3. IP boundaries (read carefully)

The reference commercial tool was originally named PRISM (later rebranded). A
real archive export from a project (`UAT_20230427.zip`) is in `reference/` as
schema and structure reference. Use it to:

- Understand **what concepts exist** in production cost-controls software
- Understand **how data is structured and related**
- Test the import pipeline end-to-end with realistic data volume

Do **not**:

- Copy table or column names verbatim from the archive into our schema
- Reproduce the commercial tool's UI screens pixel-for-pixel
- Use the commercial tool's branding, logos, or product names anywhere in the
  app
- Refer to the commercial tool by name in user-facing strings (internal code
  comments are fine for reference)

Our schema uses our own naming conventions (see `schema.sql`). Our UI uses our
own visual design (see `prototype.jsx`). The importer translates from their
format to ours — same as how LibreOffice reads `.docx` without being Microsoft
Word.

## 4. Tech stack

| Layer | Choice | Rationale |
|---|---|---|
| Backend | FastAPI (Python 3.12) + SQLAlchemy 2.0 + Alembic | Cost/EVM math is natural in Python; Pydantic models map cleanly to the complex domain. |
| Database | PostgreSQL 16 | Cost controls data has serious relational integrity requirements. |
| Frontend | React 18 + TypeScript + Vite | Industry default; TypeScript catches schema-shape bugs early. |
| Data grid | AG Grid Community | The cost control screen is a heavy spreadsheet; AG Grid handles 1000+ row virtualization out of the box. |
| Styling | Tailwind CSS + shadcn/ui | Fast iteration; clean component library. |
| Charts | Recharts | S-curves, dashboards — sufficient and easy. |
| Auth | `fastapi-users` (JWT) | No SSO at this scale. |
| Archive parsing | `pandas` (CSV reading is UTF-16 LE!) + `zipfile` (stdlib) | The archive is a zip of UTF-16 CSVs + metadata. |
| Dev environment | Docker Compose | Postgres + backend + frontend in one `docker compose up`. |
| Deployment | Railway or Render | ~$20/month for the class instance. |

## 5. V1 module scope

Build in this order:

1. **Project Setup** — projects, WBS hierarchy, CBS hierarchy, periods,
   baselines management. *Foundational; can't skip.*
2. **Cost Control** — the main grid view: cost accounts with rollup, columns
   for BAC / EV / AC / Open Commit / ETC / EAC / CPI / VAC. Filtering, search,
   expand/collapse. *Where students spend most of their time.*
3. **Time-phased view** — account × period matrix. The drill-down from the
   Cost Control grid opens this.
4. **Procurement** — vendors, contracts, commitments, invoices. The header/
   line pattern.
5. **Change Management** — trends → potential changes → approved changes;
   impact on cost accounts.
6. **EVM Dashboard** — CPI/SPI trends, S-curves, EAC forecast, KPIs by WBS
   rollup.
7. **Archive importer** — load `.PG2`-style zip archives into our schema.

**Deferred to v2:** P6 XER schedule import, risk register, document control,
ERP integration, multi-project portfolio rollup.

## 6. Role model

Two-level access:

- **System role** on the user (set by admin): `admin`, `instructor`, `student`
- **Project role** on the membership (set per project): `pm`, `cost_engineer`,
  `scheduler`, `controller`, `viewer`

A student logs in as themselves but is assigned different project roles per
exercise — so they can practice being a PM on one project and a cost engineer
on the next. Instructors can see all projects in their class and reset student
exercises.

## 7. Data model overview

Full DDL is in `schema.sql`. The conceptual model:

- **Project** owns a **WBS** (work breakdown), **CBS** (cost breakdown),
  **periods** (monthly time buckets), and **cost accounts**.
- **Cost accounts** are the atomic unit. Each is tagged to a WBS node and a
  CBS node. Most numbers live on the cost account, denormalized from
  time-phased detail.
- **`cost_account_periods`** holds the time-phased detail (one row per cost
  account × period), with parallel baseline columns
  (`budget_baseline` / `budget_approved` / `budget_control`) — the
  production-tool pattern.
- **Procurement chain**: `vendors` → `contracts` → `commitments` (which link
  to cost accounts) → `invoices` → `invoice_lines` (which also link to cost
  accounts). Commitments and invoices use the header/line pattern.
- **Change management**: `change_orders` → `change_lines` (one impact line
  per affected cost account).

Key denormalization decisions:

- `cost_accounts` carries ~20 aggregate columns (`cost_budget`, `cost_earned`,
  `cost_actual`, `cost_etc`, `cost_eac`, parallel `hour_*`, parallel BAC
  versions, cash flow params). These are sums/rollups of
  `cost_account_periods` rows. Keep them in sync via Postgres triggers or
  application-level recomputation after writes. **Reason**: the cost control
  grid scans thousands of accounts; computing aggregates on every read is too
  slow.
- WBS and CBS hierarchies are **encoded in the dotted code**, not in a
  parent_id column. Level is denormalized for query speed.
- Earned value (PV / EV / AC / CPI / SPI / EAC / VAC) is **never stored**.
  Always computed. Storing it leads to drift bugs.

## 8. The `.PG2` archive format

The reference commercial tool exports projects as zip archives containing:

- `<PROJECT>.PG2` — a one-line text file: format signature (just identifies
  the archive type)
- `<PROJECT>_info.txt` — metadata: version, export date, user, license type
- `<PROJECT>_ArchiveTables.txt` — manifest of included tables
- `<PROJECT>_ArchiveSummary.txt` — row counts per table
- `<PROJECT>_<TABLENAME>.CSV` × 148 — one CSV per table

**Critical detail: the CSVs are UTF-16 LE with BOM** (typical SQL Server
export). `pandas.read_csv(..., encoding='utf-16')` works. Plain UTF-8 readers
will choke.

The reference UAT archive (`reference/UAT_20230427.zip`) contains:
- 1,221 cost accounts
- 6,026 budget detail lines
- 4,551 time-phased records
- 2,353 account change records
- 268 change management entries
- 205 contracts
- 478 commitments
- 48 monthly reporting periods

This is realistic megaproject volume — use it for seed data and load testing.

The importer (module 7) maps their table/column names to ours. Build a
translation layer; don't adopt their schema.

## 9. UI design direction

See `prototype.jsx` for the current state. Direction is **industrial-engineering
minimalism**:

- IBM Plex Sans body, IBM Plex Mono for numbers (tabular figures critical)
- Restrained palette anchored on deep petrol-teal accent (`#0F4C5C`) on warm
  off-white (`#F4F4EE`) background; dark sidebar for navigation
- Dense information without clutter; the cost control grid is the centerpiece
- Frozen first two columns (WBS code + description) — non-negotiable for any
  grid this wide
- Color coding for variance: positive green, negative red, neutral muted gray;
  parentheses around overruns (accounting convention)
- Status indicators with icons (lock for closed periods, etc.)

Avoid: bright colors, rounded corners > 4px, drop shadows, gradients, decorative
elements. This is software people stare at for 8 hours. It should feel
substantial and quiet.

## 10. Decisions log

Running record of decisions made during planning, so the dev environment knows
what's settled vs. still open.

- **Settled:** Tech stack (§4), v1 module scope (§5), role model (§6), schema
  v2 (in `schema.sql`), UI direction (§9), IP approach (§3).
- **Settled:** Archive importer comes *after* the core UI works against mock
  data — don't block UI work on import being ready.
- **Open:** Drill-down detail panel design (right drawer vs full-page vs
  modal — pending user feedback).
- **Open:** Whether to use Postgres triggers vs. application-level recompute
  for the denormalized aggregates. Recommend application-level for the
  training tool — easier to step through with students.
- **Open:** S-curve charting library specifics. Recharts is the default but
  for the EVM dashboard we may want richer interactivity.

## 11. Next steps for the build

In rough order:

1. **Confirm understanding** — read this file, `schema.sql`, and
   `prototype.jsx`. Summarize back what you understand the project to be.
   Don't write code yet.
2. **Scaffold the repo** — Docker Compose with Postgres, FastAPI backend
   skeleton (`app/` with `main.py`, `models/`, `routes/`, `services/`,
   `db.py`), React frontend skeleton (`frontend/` with Vite, Tailwind,
   TypeScript, AG Grid). Add a `Makefile` with `up`, `migrate`, `seed`,
   `test`.
3. **Materialize the schema** — translate `schema.sql` into SQLAlchemy 2.0
   models and generate the initial Alembic migration.
4. **Seed script** — a Python script that creates one demo project with
   ~50 WBS nodes, ~200 cost accounts, 36 periods, realistic budget /
   commitments / actuals / change orders. Used for local dev and for
   testing the UI.
5. **Port the prototype** — turn `prototype.jsx` into proper React component
   files under `frontend/src/`. Use TypeScript. Wire to a `useQuery`-style
   data layer (TanStack Query).
6. **First real API** — `GET /projects/:id/cost-control` returns the WBS
   rollup tree. Frontend cost control grid renders from this endpoint
   instead of mock data.
7. From there, build out modules in §5 order.

When you start writing code: keep PRs (or commit groups) small. The user is
solo and prefers to review small diffs incrementally.
