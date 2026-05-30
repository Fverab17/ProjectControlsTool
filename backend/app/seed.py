"""
Seed script — creates one demo project with realistic EPC cost-controls data.
Run with:  docker compose exec backend python -m app.seed
Idempotent: skips if the project already exists.
"""

import asyncio
import math
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP

from passlib.context import CryptContext
from sqlalchemy import select

from app.db import AsyncSessionLocal
from app.models import (
    BudgetLine, CbsNode, ChangeLine, ChangeOrder, CostAccount,
    CostAccountPeriod, Contract, Commitment, Curve, Period, Project,
    ProjectMember, User, Vendor, WbsNode,
)
from app.models.enums import (
    ChangeImpact, ChangeReason, ChangeStatus, ContractStatus, CurveType,
    PctMethod, PriceType, ProjectRole, SystemRole,
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
PROJECT_CODE = "PETROCHEM-EXP-2024"

# ---------------------------------------------------------------------------
# Top-level entry point
# ---------------------------------------------------------------------------

async def main() -> None:
    async with AsyncSessionLocal() as db:
        existing = await db.execute(select(Project).where(Project.code == PROJECT_CODE))
        if existing.scalar_one_or_none():
            print("Project already seeded — skipping.")
            return
        await seed_all(db)
        await db.commit()
        print("\nSeed complete.")


async def seed_all(db) -> None:
    print("Creating users...")
    users = await create_users(db)

    print("Creating project...")
    project = await create_project(db)

    print("Creating project members...")
    await create_members(db, project, users)

    print("Creating CBS nodes...")
    cbs = await create_cbs(db, project)

    print("Creating WBS nodes...")
    wbs = await create_wbs(db, project)

    print("Creating periods (36 months)...")
    periods = await create_periods(db, project)

    print("Creating curves...")
    curves = await create_curves(db, project)

    print("Creating cost accounts...")
    accounts = await create_cost_accounts(db, project, wbs, cbs, curves)

    print(f"  → {len(accounts)} accounts created")

    print("Creating time-phased period data...")
    await create_account_periods(db, accounts, periods)

    print("Creating vendors & contracts...")
    vendors = await create_vendors(db)
    contracts = await create_contracts(db, project, vendors)

    print("Creating commitments...")
    await create_commitments(db, contracts, accounts, periods)

    print("Creating change orders...")
    await create_change_orders(db, project, accounts, periods)

    print("Creating budget lines...")
    await create_budget_lines(db, accounts)


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

async def create_users(db):
    users = []
    data = [
        ("instructor@cpmtraining.com", "Frank Vera",    SystemRole.instructor),
        ("student1@cpmtraining.com",   "Alex Rivera",   SystemRole.student),
        ("student2@cpmtraining.com",   "Sam Chen",      SystemRole.student),
        ("student3@cpmtraining.com",   "Jordan Okafor", SystemRole.student),
    ]
    hashed = pwd_context.hash("training123")
    for email, name, role in data:
        u = User(email=email, name=name, password_hash=hashed, system_role=role)
        db.add(u)
        users.append(u)
    await db.flush()
    return users


# ---------------------------------------------------------------------------
# Project
# ---------------------------------------------------------------------------

async def create_project(db):
    p = Project(
        code=PROJECT_CODE,
        title="Petrochemical Expansion Project 2024",
        description=(
            "Greenfield petrochemical processing facility — $305M EPC project. "
            "Used as the primary training exercise for cost control workflows."
        ),
        baseline_start=datetime(2022, 1, 1),
        baseline_finish=datetime(2025, 3, 31),
        control_start=datetime(2022, 1, 15),
        control_finish=datetime(2025, 6, 30),
        base_currency_code="USD",
    )
    db.add(p)
    await db.flush()
    return p


async def create_members(db, project, users):
    roles = [ProjectRole.pm, ProjectRole.cost_engineer, ProjectRole.scheduler, ProjectRole.viewer]
    for user, role in zip(users, roles):
        db.add(ProjectMember(user_id=user.id, project_id=project.id, project_role=role))
    await db.flush()


# ---------------------------------------------------------------------------
# CBS nodes
# ---------------------------------------------------------------------------

CBS_DATA = [
    ("L",   "Labor",                        0,  0),
    ("L.E", "Engineering Labor",            1,  1),
    ("L.C", "Construction Labor",           1,  2),
    ("L.M", "Management & Supervision",     1,  3),
    ("M",   "Materials",                    0,  4),
    ("M.E", "Major Equipment",              1,  5),
    ("M.B", "Bulk Materials",               1,  6),
    ("S",   "Subcontracts",                 0,  7),
    ("S.C", "Construction Subcontracts",    1,  8),
    ("S.O", "Other Services & Consultants", 1,  9),
    ("E",   "Expenses",                     0, 10),
    ("E.T", "Travel & Per Diem",            1, 11),
    ("E.O", "Other Direct Costs",           1, 12),
]


async def create_cbs(db, project):
    cbs_map = {}
    for code, desc, level, sort in CBS_DATA:
        node = CbsNode(project_id=project.id, code=code, description=desc, level=level, sort_order=sort)
        db.add(node)
        cbs_map[code] = node
    await db.flush()
    return cbs_map


# ---------------------------------------------------------------------------
# WBS nodes
# ---------------------------------------------------------------------------

WBS_DATA = [
    ("1",     "Engineering Services",                       0,  0),
    ("1.1",   "Process & Front-End Engineering",            1,  1),
    ("1.2",   "Mechanical Engineering",                     1,  2),
    ("1.3",   "Electrical & Instrumentation Engineering",   1,  3),
    ("1.4",   "Civil / Structural Engineering",             1,  4),
    ("2",     "Procurement",                                0,  5),
    ("2.1",   "Major Equipment",                            1,  6),
    ("2.1.1", "Compressors & Pumps",                        2,  7),
    ("2.1.2", "Vessels & Tanks",                            2,  8),
    ("2.1.3", "Heat Exchangers & Furnaces",                 2,  9),
    ("2.1.4", "Packaged Process Units",                     2, 10),
    ("2.2",   "Bulk Materials",                             1, 11),
    ("2.2.1", "Piping & Valves",                            2, 12),
    ("2.2.2", "Structural Steel",                           2, 13),
    ("2.2.3", "Electrical Bulks",                           2, 14),
    ("2.2.4", "Instrumentation Bulks",                      2, 15),
    ("2.3",   "Logistics & Freight",                        1, 16),
    ("3",     "Construction",                               0, 17),
    ("3.1",   "Civil Works & Foundations",                  1, 18),
    ("3.2",   "Structural Steel Erection",                  1, 19),
    ("3.3",   "Mechanical Installation",                    1, 20),
    ("3.4",   "Piping Installation",                        1, 21),
    ("3.5",   "Electrical & I&C Installation",              1, 22),
    ("3.6",   "Insulation & Painting",                      1, 23),
    ("4",     "Commissioning & Startup",                    0, 24),
    ("5",     "Project Management Services",                0, 25),
    ("6",     "Owner's Costs & Contingency",                0, 26),
]


async def create_wbs(db, project):
    wbs_map = {}
    for code, desc, level, sort in WBS_DATA:
        node = WbsNode(project_id=project.id, code=code, description=desc, level=level, sort_order=sort)
        db.add(node)
        wbs_map[code] = node
    await db.flush()
    return wbs_map


# ---------------------------------------------------------------------------
# Periods  (2022-01 → 2024-12, 36 months)
# ---------------------------------------------------------------------------

async def create_periods(db, project):
    from calendar import monthrange
    periods = []
    current_closed_through = (2024, 3)  # 2024-03 is the last closed period

    for year in range(2022, 2025):
        for month in range(1, 13):
            _, last_day = monthrange(year, month)
            is_closed = (year, month) <= current_closed_through
            p = Period(
                project_id=project.id,
                code=f"{year}-{month:02d}",
                period_start=datetime(year, month, 1),
                period_end=datetime(year, month, last_day),
                is_closed=is_closed,
                fiscal_year_end=(month == 12),
            )
            db.add(p)
            periods.append(p)
    await db.flush()
    return periods


# ---------------------------------------------------------------------------
# Curves
# ---------------------------------------------------------------------------

async def create_curves(db, project):
    data = [
        ("S-CURVE", "Standard S-Curve",   CurveType.s_curve),
        ("LINEAR",  "Linear Distribution", CurveType.linear),
        ("FRONT",   "Front-Loaded",        CurveType.front_loaded),
        ("BACK",    "Back-Loaded",         CurveType.back_loaded),
    ]
    curves = {}
    for code, desc, ctype in data:
        c = Curve(project_id=project.id, code=code, description=desc, curve_type=ctype)
        db.add(c)
        curves[code] = c
    await db.flush()
    return curves


# ---------------------------------------------------------------------------
# Cost accounts
# Leaf WBS node → [(cbs_code, budget_fraction, short_description)]
# ---------------------------------------------------------------------------

# Total budget by leaf WBS (USD)
WBS_BUDGET = {
    "1.1": 12_000_000, "1.2": 8_000_000,  "1.3": 6_000_000,  "1.4": 4_000_000,
    "2.1.1": 30_000_000, "2.1.2": 25_000_000, "2.1.3": 15_000_000, "2.1.4": 10_000_000,
    "2.2.1": 18_000_000, "2.2.2": 8_000_000,  "2.2.3": 5_000_000,  "2.2.4": 4_000_000,
    "2.3": 5_000_000,
    "3.1": 15_000_000, "3.2": 12_000_000, "3.3": 35_000_000,
    "3.4": 25_000_000, "3.5": 15_000_000, "3.6": 3_000_000,
    "4": 15_000_000, "5": 15_000_000, "6": 15_000_000,
}

# Progress at data cut-off date
WBS_PCT = {
    "1.1": 0.90, "1.2": 0.75, "1.3": 0.60, "1.4": 0.50,
    "2.1.1": 0.80, "2.1.2": 0.85, "2.1.3": 0.65, "2.1.4": 0.45,
    "2.2.1": 0.55, "2.2.2": 0.62, "2.2.3": 0.38, "2.2.4": 0.32,
    "2.3": 0.45,
    "3.1": 0.78, "3.2": 0.52, "3.3": 0.28, "3.4": 0.22, "3.5": 0.12, "3.6": 0.05,
    "4": 0.02, "5": 0.55, "6": 0.40,
}

WBS_CPI = {
    "1.1": 0.96, "1.2": 0.92, "1.3": 0.91, "1.4": 0.95,
    "2.1.1": 1.02, "2.1.2": 0.98, "2.1.3": 0.94, "2.1.4": 0.99,
    "2.2.1": 0.91, "2.2.2": 0.96, "2.2.3": 0.92, "2.2.4": 0.95,
    "2.3": 0.88,
    "3.1": 0.92, "3.2": 0.88, "3.3": 0.86, "3.4": 0.87, "3.5": 0.91, "3.6": 1.00,
    "4": 1.00, "5": 0.93, "6": 1.00,
}

ACCOUNT_TEMPLATES = {
    "1.1": [
        ("L.E", 0.60, "Direct Engineering Labor"),
        ("L.M", 0.10, "Lead & Management Labor"),
        ("S.O", 0.20, "Specialist Consultants"),
        ("E.T", 0.04, "Travel & Living"),
        ("E.O", 0.04, "Software & Licenses"),
        ("M.B", 0.02, "Office Materials"),
    ],
    "1.2": [
        ("L.E", 0.62, "Direct Engineering Labor"),
        ("L.M", 0.08, "Lead & Management Labor"),
        ("S.O", 0.22, "Specialist Consultants"),
        ("E.T", 0.04, "Travel & Living"),
        ("E.O", 0.04, "Software & Licenses"),
    ],
    "1.3": [
        ("L.E", 0.60, "Direct Engineering Labor"),
        ("L.M", 0.08, "Lead & Management Labor"),
        ("S.O", 0.24, "Specialist Consultants"),
        ("E.T", 0.04, "Travel & Living"),
        ("E.O", 0.04, "Software & Licenses"),
    ],
    "1.4": [
        ("L.E", 0.65, "Direct Engineering Labor"),
        ("L.M", 0.08, "Lead & Management Labor"),
        ("S.O", 0.20, "Specialist Consultants"),
        ("E.T", 0.04, "Travel & Living"),
        ("E.O", 0.03, "Software & Other Direct"),
    ],
    "2.1.1": [
        ("M.E", 0.85, "Equipment Supply"),
        ("S.O", 0.10, "Vendor Assistance & Commissioning"),
        ("E.O", 0.05, "Inspection & Third-Party Testing"),
    ],
    "2.1.2": [
        ("M.E", 0.85, "Equipment Supply"),
        ("S.O", 0.10, "Vendor Assistance"),
        ("E.O", 0.05, "Inspection & Testing"),
    ],
    "2.1.3": [
        ("M.E", 0.88, "Equipment Supply"),
        ("S.O", 0.08, "Vendor Assistance"),
        ("E.O", 0.04, "Inspection & Testing"),
    ],
    "2.1.4": [
        ("M.E", 0.82, "Package Supply"),
        ("S.O", 0.12, "Vendor Integration Support"),
        ("E.O", 0.06, "Inspection & Testing"),
    ],
    "2.2.1": [
        ("M.B", 0.80, "Piping & Valve Supply"),
        ("S.O", 0.12, "Material Expediting"),
        ("E.O", 0.08, "Freight & Import Duty"),
    ],
    "2.2.2": [
        ("M.B", 0.82, "Structural Steel Supply"),
        ("S.O", 0.10, "Expediting"),
        ("E.O", 0.08, "Freight & Import Duty"),
    ],
    "2.2.3": [
        ("M.B", 0.80, "Electrical Materials Supply"),
        ("S.O", 0.12, "Expediting"),
        ("E.O", 0.08, "Freight & Import Duty"),
    ],
    "2.2.4": [
        ("M.B", 0.80, "Instrumentation Supply"),
        ("S.O", 0.12, "Expediting"),
        ("E.O", 0.08, "Freight & Import Duty"),
    ],
    "2.3": [
        ("S.O", 0.70, "Freight & Shipping"),
        ("E.O", 0.20, "Customs & Duties"),
        ("L.M", 0.10, "Logistics Coordination"),
    ],
    "3.1": [
        ("S.C", 0.50, "Civil Subcontract"),
        ("L.C", 0.22, "Direct Construction Labor"),
        ("M.B", 0.15, "Bulk Materials — Civil"),
        ("L.M", 0.08, "Construction Supervision"),
        ("E.T", 0.03, "Camp & Travel"),
        ("E.O", 0.02, "Direct Field Costs"),
    ],
    "3.2": [
        ("S.C", 0.48, "Steel Erection Subcontract"),
        ("L.C", 0.26, "Direct Construction Labor"),
        ("M.B", 0.10, "Consumables & Welding"),
        ("L.M", 0.10, "Construction Supervision"),
        ("E.T", 0.04, "Camp & Travel"),
        ("E.O", 0.02, "Direct Field Costs"),
    ],
    "3.3": [
        ("S.C", 0.48, "Mechanical Installation Subcontract"),
        ("L.C", 0.28, "Direct Construction Labor"),
        ("M.B", 0.10, "Installation Materials"),
        ("L.M", 0.08, "Construction Supervision"),
        ("E.T", 0.04, "Camp & Travel"),
        ("E.O", 0.02, "Direct Field Costs"),
    ],
    "3.4": [
        ("S.C", 0.50, "Piping Installation Subcontract"),
        ("L.C", 0.26, "Direct Construction Labor"),
        ("M.B", 0.10, "Consumables & Welding"),
        ("L.M", 0.08, "Construction Supervision"),
        ("E.T", 0.04, "Camp & Travel"),
        ("E.O", 0.02, "Direct Field Costs"),
    ],
    "3.5": [
        ("S.C", 0.52, "E&I Installation Subcontract"),
        ("L.C", 0.24, "Direct Construction Labor"),
        ("M.B", 0.10, "Installation Materials"),
        ("L.M", 0.08, "Construction Supervision"),
        ("E.T", 0.04, "Camp & Travel"),
        ("E.O", 0.02, "Direct Field Costs"),
    ],
    "3.6": [
        ("S.C", 0.68, "Insulation & Painting Subcontract"),
        ("L.C", 0.16, "Direct Construction Labor"),
        ("M.B", 0.12, "Materials"),
        ("E.O", 0.04, "Direct Field Costs"),
    ],
    "4": [
        ("L.E", 0.38, "Commissioning Engineering"),
        ("L.C", 0.28, "Commissioning Technicians"),
        ("S.O", 0.18, "Vendor Commissioning Support"),
        ("M.B", 0.08, "Commissioning Spares & Consumables"),
        ("E.T", 0.05, "Travel & Living"),
        ("E.O", 0.03, "Other Commissioning Costs"),
    ],
    "5": [
        ("L.M", 0.55, "Project Management Labor"),
        ("L.E", 0.15, "Project Controls & Planning"),
        ("S.O", 0.15, "PMC Consultants"),
        ("E.T", 0.08, "Travel & Living"),
        ("E.O", 0.05, "Office & Communications"),
        ("M.B", 0.02, "Office Supplies"),
    ],
    "6": [
        ("E.O", 0.50, "Project Contingency Allowance"),
        ("L.M", 0.25, "Owner's Project Team"),
        ("S.O", 0.15, "Legal & Financial Services"),
        ("E.T", 0.10, "Owner's Travel & Expenses"),
    ],
}


def d(value: float) -> Decimal:
    return Decimal(str(round(value, 2)))


async def create_cost_accounts(db, project, wbs, cbs, curves):
    s_curve = curves.get("S-CURVE")
    accounts = []

    for wbs_code, templates in ACCOUNT_TEMPLATES.items():
        wbs_node = wbs.get(wbs_code)
        total_budget = WBS_BUDGET.get(wbs_code, 5_000_000)
        pct = WBS_PCT.get(wbs_code, 0.5)
        cpi = WBS_CPI.get(wbs_code, 0.95)

        for cbs_code, fraction, desc_suffix in templates:
            cbs_node = cbs.get(cbs_code)
            budget = total_budget * fraction
            earned = budget * pct
            actual = earned / cpi if cpi else earned
            etc = budget - earned
            eac = actual + (etc / cpi if cpi else etc)
            open_commit = max(0, budget * 0.85 - actual) * 0.55

            code_safe = wbs_code.replace(".", "") + "-" + cbs_code.replace(".", "")
            account_code = f"CA-{code_safe}"
            wbs_desc = wbs_node.description if wbs_node else wbs_code

            acc = CostAccount(
                project_id=project.id,
                account_code=account_code,
                description=f"{wbs_desc} — {desc_suffix}",
                wbs_node_id=wbs_node.id if wbs_node else None,
                cbs_node_id=cbs_node.id if cbs_node else None,
                curve_id=s_curve.id if s_curve else None,
                pct_complete=d(pct),
                pct_complete_method=PctMethod.manual,
                cost_budget=d(budget),
                cost_earned=d(earned),
                cost_actual=d(actual),
                cost_incurred=d(actual + open_commit),
                cost_commitment=d(actual + open_commit),
                cost_open_commit=d(open_commit),
                cost_etc=d(etc),
                cost_eac=d(eac),
                cost_bac_baseline=d(budget * 0.92),
                cost_bac_approved=d(budget * 0.96),
                cost_bac_control=d(budget),
                cost_bac_changes=d(budget * 0.04),
                hour_budget=d(budget * 0.028),
                hour_earned=d(earned * 0.028),
                hour_actual=d(actual * 0.028),
                hour_etc=d(etc * 0.028),
                hour_eac=d(eac * 0.028),
                baseline_start=datetime(2022, 1, 1),
                baseline_finish=datetime(2025, 3, 31),
                control_start=datetime(2022, 1, 15),
                control_finish=datetime(2025, 6, 30),
            )
            db.add(acc)
            accounts.append(acc)

    await db.flush()
    return accounts


# ---------------------------------------------------------------------------
# Time-phased period data
# ---------------------------------------------------------------------------

def bell_weights(n: int, peak: float = 0.45, sigma: float = 0.18) -> list[float]:
    raw = [math.exp(-((i / n - peak) ** 2) / (2 * sigma ** 2)) for i in range(n)]
    total = sum(raw)
    return [r / total for r in raw]


async def create_account_periods(db, accounts, periods):
    n = len(periods)
    weights = bell_weights(n)

    for acc in accounts:
        budget = float(acc.cost_budget or 0)
        actual_total = float(acc.cost_actual or 0)
        earned_total = float(acc.cost_earned or 0)
        pct = float(acc.pct_complete or 0)

        filled = max(1, int(n * pct * 0.85))
        filled_w = sum(weights[:filled]) or 1

        for i, (period, w) in enumerate(zip(periods, weights)):
            pb = round(budget * w, 2)
            pa = round(actual_total * weights[i] / filled_w, 2) if i < filled else 0.0
            pe = round(earned_total * weights[i] / filled_w, 2) if i < filled else 0.0

            db.add(CostAccountPeriod(
                cost_account_id=acc.id,
                period_id=period.id,
                budget_baseline=d(pb * 0.92),
                budget_approved=d(pb * 0.96),
                budget_control=d(pb),
                earned=d(pe),
                actual=d(pa),
                hour_budget=d(pb * 0.028),
                hour_earned=d(pe * 0.028),
                hour_actual=d(pa * 0.028),
            ))

    await db.flush()


# ---------------------------------------------------------------------------
# Vendors & contracts
# ---------------------------------------------------------------------------

async def create_vendors(db):
    data = [
        ("Fluor Engineering LLC",   "John Smith",    "jsmith@fluor.example.com",    "+1-713-555-0101"),
        ("Bechtel Supply Co.",      "Sarah Johnson", "sjohnson@bechtel.example.com","+1-415-555-0202"),
        ("KBR Construction",        "Mike Davis",    "mdavis@kbr.example.com",      "+1-713-555-0303"),
        ("Worley Process Systems",  "Lisa Wang",     "lwang@worley.example.com",    "+61-7-555-0404"),
        ("CIRCOR International",    "Tom Brown",     "tbrown@circor.example.com",   "+1-978-555-0505"),
    ]
    vendors = []
    for name, contact, email, phone in data:
        v = Vendor(name=name, contact=contact, email=email, phone=phone)
        db.add(v)
        vendors.append(v)
    await db.flush()
    return vendors


async def create_contracts(db, project, vendors):
    data = [
        ("CTR-0001", "Process & FEED Engineering Services",       0, ContractStatus.active,  PriceType.reimbursable,      8_500_000),
        ("CTR-0042", "Major Equipment Supply — Compressors/Pumps", 1, ContractStatus.active,  PriceType.lump_sum,          28_000_000),
        ("CTR-0108", "Vessels & Tanks Supply",                    2, ContractStatus.active,  PriceType.lump_sum,          22_000_000),
        ("CTR-0201", "Civil & Structural Construction",           3, ContractStatus.active,  PriceType.lump_sum,          25_000_000),
        ("CTR-0310", "Mechanical & Piping Installation",          4, ContractStatus.active,  PriceType.time_and_materials, 45_000_000),
    ]
    contracts = []
    for code, desc, vi, status, ptype, cost in data:
        c = Contract(
            project_id=project.id,
            contract_code=code,
            description=desc,
            vendor_id=vendors[vi].id,
            status=status,
            price_type=ptype,
            cost=Decimal(str(cost)),
            award_date=datetime(2022, 3, 1),
            mobilize_date=datetime(2022, 4, 1),
            retention_pct=Decimal("0.05"),
        )
        db.add(c)
        contracts.append(c)
    await db.flush()
    return contracts


# ---------------------------------------------------------------------------
# Commitments  (a sample against matching cost accounts)
# ---------------------------------------------------------------------------

async def create_commitments(db, contracts, accounts, periods):
    period_map = {p.code: p for p in periods}

    # Find accounts by code prefix for targeting
    def find_accounts(prefix: str) -> list:
        return [a for a in accounts if a.account_code.startswith(f"CA-{prefix}")]

    commit_specs = [
        # (contract_idx, account_prefix, period_code, fraction_of_budget)
        (0, "11-LE",   "2022-03", 0.60),
        (0, "11-SO",   "2022-03", 0.70),
        (1, "211-ME",  "2022-06", 0.85),
        (2, "212-ME",  "2022-08", 0.82),
        (3, "31-SC",   "2023-01", 0.50),
        (3, "31-LC",   "2023-01", 0.40),
        (4, "33-SC",   "2023-03", 0.48),
        (4, "34-SC",   "2023-04", 0.50),
    ]

    for contract_idx, prefix, period_code, fraction in commit_specs:
        contract = contracts[contract_idx]
        period = period_map.get(period_code)
        matching = find_accounts(prefix)

        if not matching or not period:
            continue

        acc = matching[0]
        cost = float(acc.cost_budget or 0) * fraction
        db.add(Commitment(
            contract_id=contract.id,
            cost_account_id=acc.id,
            period_id=period.id,
            item=1,
            cost=d(cost),
            hours=d(cost * 0.028),
            pending=False,
        ))

    await db.flush()


# ---------------------------------------------------------------------------
# Change orders
# ---------------------------------------------------------------------------

async def create_change_orders(db, project, accounts, periods):
    period_map = {p.code: p for p in periods}

    def find_account(prefix: str):
        for a in accounts:
            if a.account_code.startswith(f"CA-{prefix}"):
                return a
        return None

    change_specs = [
        ("CO-001", "Additional scope — site conditions (civil foundations)",
         ChangeStatus.approved, ChangeReason.site_conditions, ChangeImpact.cost,
         "2023-03", [("31-SC", 380_000), ("31-LC", 120_000)]),

        ("CO-007", "Design revision — heat exchanger material upgrade",
         ChangeStatus.approved, ChangeReason.design, ChangeImpact.cost,
         "2023-08", [("213-ME", 650_000), ("213-SO", 95_000)]),

        ("CO-015", "Schedule acceleration — piping installation premium",
         ChangeStatus.submitted, ChangeReason.schedule, ChangeImpact.both,
         "2024-01", [("34-SC", 420_000), ("34-LC", 180_000)]),

        ("CO-018", "Rate escalation — bulk material procurement",
         ChangeStatus.trend, ChangeReason.rate, ChangeImpact.cost,
         "2024-02", [("221-MB", 310_000)]),

        ("CO-022", "Additional instrumentation — regulatory requirement",
         ChangeStatus.trend, ChangeReason.scope, ChangeImpact.cost,
         "2024-03", [("224-MB", 275_000), ("13-LE", 95_000)]),
    ]

    for code, desc, status, reason, impact, period_code, line_specs in change_specs:
        period = period_map.get(period_code)
        co = ChangeOrder(
            project_id=project.id,
            change_code=code,
            description=desc,
            status=status,
            reason=reason,
            impact=impact,
            request_date=period.period_start if period else datetime(2023, 6, 1),
            period_id=period.id if period else None,
        )
        db.add(co)
        await db.flush()

        for prefix, cost_impact in line_specs:
            acc = find_account(prefix)
            if acc:
                db.add(ChangeLine(
                    change_order_id=co.id,
                    cost_account_id=acc.id,
                    cost_impact=d(cost_impact),
                    hour_impact=d(cost_impact * 0.028),
                ))

    await db.flush()


# ---------------------------------------------------------------------------
# Budget lines  (3 lines per account — quantity / rate / cost breakdown)
# ---------------------------------------------------------------------------

async def create_budget_lines(db, accounts):
    for acc in accounts:
        budget = float(acc.cost_budget or 0)
        cbs_code = ""
        if acc.cbs_node_id:
            # derive a short label from the account code
            parts = acc.account_code.split("-")
            cbs_code = parts[-1] if parts else ""

        lines = [
            (f"Direct cost — {acc.description[:40]}",  None, None, budget * 0.70),
            ("Indirect & overhead allocation",           None, None, budget * 0.20),
            ("Contingency reserve",                      None, None, budget * 0.10),
        ]

        for line_desc, qty, unit, cost in lines:
            db.add(BudgetLine(
                cost_account_id=acc.id,
                description=line_desc,
                cost=d(cost),
                is_final=False,
                imported=False,
            ))

    await db.flush()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    asyncio.run(main())
