-- ===========================================================================
-- CPM Training Clone — PostgreSQL Schema v2
-- ===========================================================================
-- Designed for a vocational training tool that mirrors the domain model of
-- commercial cost-controls software. Names are our own. See SPEC.md §3 for
-- IP boundaries and §7 for the design rationale behind the denormalization
-- and parallel-baseline choices.
--
-- Run with:  psql <db> -f schema.sql
-- Or use as a reference for the SQLAlchemy 2.0 models + Alembic migration.
-- ===========================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- for gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE system_role     AS ENUM ('admin', 'instructor', 'student');
CREATE TYPE project_role    AS ENUM ('pm', 'cost_engineer', 'scheduler', 'controller', 'viewer');
CREATE TYPE project_status  AS ENUM ('active', 'on_hold', 'closed', 'cancelled', 'completed');
CREATE TYPE project_type    AS ENUM ('capex', 'opex', 'abex');
CREATE TYPE pct_method      AS ENUM ('manual', 'weighted_steps', 'rules_of_credit', 'level_of_effort', 'fifty_fifty');
CREATE TYPE contract_status AS ENUM ('draft', 'awarded', 'active', 'closed', 'cancelled');
CREATE TYPE invoice_status  AS ENUM ('draft', 'pending', 'approved', 'paid', 'rejected');
CREATE TYPE change_status   AS ENUM ('pending', 'trend', 'submitted', 'approved', 'rejected', 'withdrawn', 'cancelled');
CREATE TYPE change_category AS ENUM ('budget_transfer', 'scope', 'growth', 'trend');
CREATE TYPE change_reason   AS ENUM ('scope', 'design', 'site_conditions', 'schedule', 'rate', 'other');
CREATE TYPE change_impact   AS ENUM ('cost', 'schedule', 'both', 'none');
CREATE TYPE price_type      AS ENUM ('lump_sum', 'unit_rate', 'reimbursable', 'time_and_materials');
CREATE TYPE curve_type      AS ENUM ('linear', 's_curve', 'front_loaded', 'back_loaded', 'milestone');

-- ---------------------------------------------------------------------------
-- Users & access
-- ---------------------------------------------------------------------------
CREATE TABLE users (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email        TEXT         NOT NULL UNIQUE,
    name         TEXT         NOT NULL,
    password_hash TEXT        NOT NULL,
    system_role  system_role  NOT NULL DEFAULT 'student',
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE projects (
    id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    code                TEXT           NOT NULL UNIQUE,
    title               TEXT           NOT NULL,
    description         TEXT,

    -- Classification & ownership
    project_status      project_status,
    is_closed           BOOLEAN        NOT NULL DEFAULT FALSE,
    project_type        project_type,
    region              TEXT,
    asset               TEXT,
    sponsor             TEXT,
    pm_name             TEXT,
    controls_lead       TEXT,
    scope_of_work       TEXT,
    notes               TEXT,

    -- Three baseline date sets: original → approved → control (current)
    baseline_start      DATE,
    baseline_finish     DATE,
    approved_start      DATE,
    approved_finish     DATE,
    control_start       DATE,
    control_finish      DATE,

    base_currency_code  CHAR(3)        NOT NULL DEFAULT 'USD',
    multi_currency      BOOLEAN        NOT NULL DEFAULT FALSE,

    -- Denormalized project rollup (refreshed when cost_accounts change)
    cost_budget         NUMERIC(18,2)  DEFAULT 0,
    cost_actual         NUMERIC(18,2)  DEFAULT 0,
    cost_eac            NUMERIC(18,2)  DEFAULT 0,
    cost_ac_variance    NUMERIC(18,2)  DEFAULT 0,
    budget_remain       NUMERIC(18,2)  DEFAULT 0,

    created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TABLE project_members (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id   UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    project_role project_role NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, project_id)
);

-- ---------------------------------------------------------------------------
-- Breakdown structures (hierarchy encoded in the dotted code, not in FKs)
-- ---------------------------------------------------------------------------
CREATE TABLE wbs_nodes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    code        TEXT NOT NULL,      -- e.g. '1.2.3'
    description TEXT NOT NULL,
    level       INT  NOT NULL,      -- denormalized: count of dots in code
    sort_order  INT  NOT NULL DEFAULT 0,
    UNIQUE (project_id, code)
);
CREATE INDEX idx_wbs_project ON wbs_nodes(project_id);

CREATE TABLE cbs_nodes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    code        TEXT NOT NULL,
    description TEXT NOT NULL,
    level       INT  NOT NULL,
    sort_order  INT  NOT NULL DEFAULT 0,
    UNIQUE (project_id, code)
);
CREATE INDEX idx_cbs_project ON cbs_nodes(project_id);

-- ---------------------------------------------------------------------------
-- Periods & currency
-- ---------------------------------------------------------------------------
CREATE TABLE periods (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID    NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    code            TEXT    NOT NULL,    -- e.g. '2024-04'
    period_start    DATE    NOT NULL,
    period_end      DATE    NOT NULL,
    is_closed       BOOLEAN NOT NULL DEFAULT FALSE,
    fiscal_year_end BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (project_id, code)
);
CREATE INDEX idx_periods_project ON periods(project_id, period_end);

CREATE TABLE currency_rates (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    period_id     UUID NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
    currency_code CHAR(3) NOT NULL,
    rate_to_base  NUMERIC(18,8) NOT NULL,
    UNIQUE (period_id, currency_code)
);

-- ---------------------------------------------------------------------------
-- Curves (templates for spreading cost across time)
-- ---------------------------------------------------------------------------
CREATE TABLE curves (
    id          UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID       NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    code        TEXT       NOT NULL,
    description TEXT,
    curve_type  curve_type NOT NULL,
    UNIQUE (project_id, code)
);

-- ---------------------------------------------------------------------------
-- Cost accounts — the heart of the model
-- Heavily denormalized: aggregate columns roll up from cost_account_periods.
-- Keep them in sync at the application layer after any time-phased write.
-- ---------------------------------------------------------------------------
CREATE TABLE cost_accounts (
    id                  UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID       NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    account_code        TEXT       NOT NULL,
    description         TEXT       NOT NULL,
    master_account_id   UUID       REFERENCES cost_accounts(id),
    wbs_node_id         UUID       REFERENCES wbs_nodes(id),
    cbs_node_id         UUID       REFERENCES cbs_nodes(id),
    curve_id            UUID       REFERENCES curves(id),
    approved_curve_id   UUID       REFERENCES curves(id),
    vendor_id           UUID       REFERENCES vendors(id),
    discipline          TEXT,

    -- User-defined dimensions (OBS, region, area, etc.)
    dim_1               TEXT,
    dim_2               TEXT,
    dim_3               TEXT,
    dim_4               TEXT,
    dim_5               TEXT,

    -- Progress
    pct_complete          NUMERIC(6,4) DEFAULT 0,
    pct_complete_prev     NUMERIC(6,4) DEFAULT 0,
    pct_complete_proposed NUMERIC(6,4) DEFAULT 0,
    pct_complete_adjusted NUMERIC(6,4) DEFAULT 0,
    pct_complete_method   pct_method   NOT NULL DEFAULT 'manual',

    -- Multi-currency
    currency_code       CHAR(3)    NOT NULL DEFAULT 'USD',
    rate_type           TEXT,

    -- Three baseline date sets: original → approved → control (current)
    baseline_start      DATE,
    baseline_finish     DATE,
    approved_start      DATE,
    approved_finish     DATE,
    control_start       DATE,
    control_finish      DATE,

    -- Denormalized cost aggregates (rolled up from cost_account_periods)
    cost_budget         NUMERIC(18,2) DEFAULT 0,
    cost_earned         NUMERIC(18,2) DEFAULT 0,
    cost_actual         NUMERIC(18,2) DEFAULT 0,
    cost_incurred       NUMERIC(18,2) DEFAULT 0,
    cost_commitment     NUMERIC(18,2) DEFAULT 0,
    cost_open_commit    NUMERIC(18,2) DEFAULT 0,
    cost_etc            NUMERIC(18,2) DEFAULT 0,
    cost_eac            NUMERIC(18,2) DEFAULT 0,
    cost_eac_proposed   NUMERIC(18,2) DEFAULT 0,
    cost_eac_adjusted   NUMERIC(18,2) DEFAULT 0,
    cost_ac_variance    NUMERIC(18,2) DEFAULT 0,

    -- Hour aggregates (parallel to cost set)
    hour_budget         NUMERIC(18,2) DEFAULT 0,
    hour_earned         NUMERIC(18,2) DEFAULT 0,
    hour_actual         NUMERIC(18,2) DEFAULT 0,
    hour_incurred       NUMERIC(18,2) DEFAULT 0,
    hour_commitment     NUMERIC(18,2) DEFAULT 0,
    hour_open_commit    NUMERIC(18,2) DEFAULT 0,
    hour_etc            NUMERIC(18,2) DEFAULT 0,
    hour_eac            NUMERIC(18,2) DEFAULT 0,

    -- Parallel BAC versions (original vs approved vs control)
    cost_bac_baseline   NUMERIC(18,2) DEFAULT 0,
    cost_bac_approved   NUMERIC(18,2) DEFAULT 0,
    cost_bac_control    NUMERIC(18,2) DEFAULT 0,
    cost_bac_changes    NUMERIC(18,2) DEFAULT 0,

    -- Cash flow modeling
    cf_adv_pay_pct      NUMERIC(6,4) DEFAULT 0,
    cf_retention_pct    NUMERIC(6,4) DEFAULT 0,
    cash_flow_lag       INT          DEFAULT 0,

    notes               TEXT,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (project_id, account_code)
);
CREATE INDEX idx_ca_project ON cost_accounts(project_id);
CREATE INDEX idx_ca_wbs     ON cost_accounts(wbs_node_id);
CREATE INDEX idx_ca_cbs     ON cost_accounts(cbs_node_id);
CREATE INDEX idx_ca_master  ON cost_accounts(master_account_id);

-- Time-phased: one row per (cost_account, period)
-- Parallel baseline columns: production-tool pattern, not strict 1NF
CREATE TABLE cost_account_periods (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cost_account_id UUID NOT NULL REFERENCES cost_accounts(id) ON DELETE CASCADE,
    period_id       UUID NOT NULL REFERENCES periods(id) ON DELETE CASCADE,

    -- Parallel baselines
    budget_baseline NUMERIC(18,2) DEFAULT 0,
    budget_approved NUMERIC(18,2) DEFAULT 0,
    budget_control  NUMERIC(18,2) DEFAULT 0,

    -- Actuals & progress
    earned          NUMERIC(18,2) DEFAULT 0,
    actual          NUMERIC(18,2) DEFAULT 0,
    commitment      NUMERIC(18,2) DEFAULT 0,
    cash_flow       NUMERIC(18,2) DEFAULT 0,
    change_approved NUMERIC(18,2) DEFAULT 0,

    -- Parallel hours
    hour_budget     NUMERIC(18,2) DEFAULT 0,
    hour_earned     NUMERIC(18,2) DEFAULT 0,
    hour_actual     NUMERIC(18,2) DEFAULT 0,

    UNIQUE (cost_account_id, period_id)
);
CREATE INDEX idx_cap_period ON cost_account_periods(period_id);

-- Budget lines — takeoff/estimate detail behind each cost account budget
CREATE TABLE budget_lines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cost_account_id UUID NOT NULL REFERENCES cost_accounts(id) ON DELETE CASCADE,
    change_order_id UUID,    -- nullable; populated if line came from a change order
    description     TEXT,
    quantity        NUMERIC(18,4) DEFAULT 0,
    quantity_unit   TEXT,
    hour_rate       NUMERIC(18,4) DEFAULT 0,
    hours           NUMERIC(18,2) DEFAULT 0,
    cost            NUMERIC(18,2) DEFAULT 0,
    x_cost          NUMERIC(18,2) DEFAULT 0,    -- transaction currency amount
    currency_code   CHAR(3) NOT NULL DEFAULT 'USD',
    is_final        BOOLEAN NOT NULL DEFAULT FALSE,
    imported        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_budget_lines_ca ON budget_lines(cost_account_id);

-- ---------------------------------------------------------------------------
-- Procurement: vendors → contracts → commitments / invoices
-- ---------------------------------------------------------------------------
CREATE TABLE vendors (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    contact    TEXT,
    email      TEXT,
    phone      TEXT,
    class_code TEXT
);

CREATE TABLE contracts (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID            NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    contract_code   TEXT            NOT NULL,
    description     TEXT,
    vendor_id       UUID            REFERENCES vendors(id),
    status          contract_status NOT NULL DEFAULT 'draft',
    price_type      price_type      NOT NULL DEFAULT 'lump_sum',
    award_date      DATE,
    mobilize_date   DATE,
    cost            NUMERIC(18,2)   DEFAULT 0,
    hours           NUMERIC(18,2)   DEFAULT 0,
    ceiling         NUMERIC(18,2)   DEFAULT 0,
    currency_code   CHAR(3)         NOT NULL DEFAULT 'USD',
    retention_pct   NUMERIC(6,4)    DEFAULT 0,
    adv_payment_pct NUMERIC(6,4)    DEFAULT 0,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, contract_code)
);
CREATE INDEX idx_contracts_project ON contracts(project_id);
CREATE INDEX idx_contracts_vendor  ON contracts(vendor_id);

CREATE TABLE contract_lines (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    item_no     INT  NOT NULL,
    description TEXT,
    quantity    NUMERIC(18,4) DEFAULT 0,
    hours       NUMERIC(18,2) DEFAULT 0,
    cost        NUMERIC(18,2) DEFAULT 0,
    UNIQUE (contract_id, item_no)
);

-- Commitments — header/line pattern linking contracts to cost accounts × periods
CREATE TABLE commitments (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id     UUID    NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    cost_account_id UUID    NOT NULL REFERENCES cost_accounts(id),
    period_id       UUID    NOT NULL REFERENCES periods(id),
    item            INT,
    revision        INT     DEFAULT 0,
    hours           NUMERIC(18,2) DEFAULT 0,
    cost            NUMERIC(18,2) DEFAULT 0,
    x_cost          NUMERIC(18,2) DEFAULT 0,
    currency_code   CHAR(3) NOT NULL DEFAULT 'USD',
    post_date       DATE,
    pending         BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_commitments_ca     ON commitments(cost_account_id);
CREATE INDEX idx_commitments_period ON commitments(period_id);

CREATE TABLE invoices (
    id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id   UUID           NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    invoice_no    TEXT           NOT NULL,
    invoice_date  DATE           NOT NULL,
    status        invoice_status NOT NULL DEFAULT 'pending',
    total_cost    NUMERIC(18,2)  DEFAULT 0,
    currency_code CHAR(3)        NOT NULL DEFAULT 'USD'
);

CREATE TABLE invoice_lines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    cost_account_id UUID NOT NULL REFERENCES cost_accounts(id),
    period_id       UUID NOT NULL REFERENCES periods(id),
    hours           NUMERIC(18,2) DEFAULT 0,
    cost            NUMERIC(18,2) DEFAULT 0,
    x_cost          NUMERIC(18,2) DEFAULT 0
);
CREATE INDEX idx_invoice_lines_ca     ON invoice_lines(cost_account_id);
CREATE INDEX idx_invoice_lines_period ON invoice_lines(period_id);

-- ---------------------------------------------------------------------------
-- Change Management
-- ---------------------------------------------------------------------------
CREATE TABLE change_orders (
    id             UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id     UUID            NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    change_code    TEXT            NOT NULL,
    description    TEXT,
    status         change_status   NOT NULL DEFAULT 'trend',
    reason         change_reason,
    impact         change_impact   NOT NULL DEFAULT 'cost',
    category       change_category,
    segment        TEXT,
    reference_code TEXT,
    requester      TEXT,
    request_date   DATE,
    status_date    DATE,
    issued_date    DATE,
    approved_date  DATE,
    is_final       BOOLEAN         NOT NULL DEFAULT FALSE,
    scope_notes    TEXT,
    comments       TEXT,
    period_id      UUID            REFERENCES periods(id),
    added_days     NUMERIC(8,2)    DEFAULT 0,
    pct_complete   NUMERIC(6,4)    DEFAULT 0,
    UNIQUE (project_id, change_code)
);

CREATE TABLE change_lines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    change_order_id UUID NOT NULL REFERENCES change_orders(id) ON DELETE CASCADE,
    cost_account_id UUID NOT NULL REFERENCES cost_accounts(id),
    hour_impact     NUMERIC(18,2) DEFAULT 0,
    cost_impact     NUMERIC(18,2) DEFAULT 0
);
CREATE INDEX idx_change_lines_ca ON change_lines(cost_account_id);

-- Late FK now that change_orders exists
ALTER TABLE budget_lines
    ADD CONSTRAINT fk_budget_lines_change_order
    FOREIGN KEY (change_order_id) REFERENCES change_orders(id);
