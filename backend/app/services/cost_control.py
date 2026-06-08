from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import CostAccount, Project, WbsNode
from app.models.breakdown import Period
from app.models.cost import CostAccountPeriod
from app.models.enums import EtcMethod
from app.schemas.cost_control import CostControlOut, PeriodCloseOut, WbsRowOut

D = Decimal


def compute_eac(account: CostAccount) -> tuple[Decimal, Decimal]:
    """Return (etc, eac) based on the account's etc_method.

    Mirrors the five EAC forecast modes used in PRISM G2 cost controls:
      manual           – user-entered ETC kept as-is; EAC = AC + ETC
      budget_remaining – ETC = max(0, BAC - EV);     EAC = AC + ETC
      performance_factor – EAC = BAC / CPI;          ETC = max(0, EAC - AC)
      commitments      – EAC = AC + open_commits;    ETC = max(0, open_commits)
      closed           – ETC = 0;                    EAC = AC
    """
    bac    = account.cost_bac_control or account.cost_budget or D("0")
    ev     = account.cost_earned  or D("0")
    ac     = account.cost_actual  or D("0")
    etc_in = account.cost_etc     or D("0")
    oc     = account.cost_open_commit or D("0")
    method = account.etc_method

    if method == EtcMethod.closed:
        return D("0"), ac

    if method == EtcMethod.budget_remaining:
        etc = max(D("0"), bac - ev)
        return etc, ac + etc

    if method == EtcMethod.performance_factor:
        cpi = (ev / ac).quantize(D("0.0001")) if ac > 0 else D("1.0000")
        eac = (bac / cpi).quantize(D("0.01")) if cpi > 0 else bac
        etc = max(D("0"), eac - ac)
        return etc, eac

    if method == EtcMethod.commitments:
        eac = ac + oc
        etc = max(D("0"), oc)
        return etc, eac

    # manual (default) — keep stored ETC
    return etc_in, ac + etc_in


def _parent_code(code: str) -> str | None:
    return code.rsplit(".", 1)[0] if "." in code else None


async def get_cost_control(project_id: UUID, db: AsyncSession, period_code: str | None = None) -> CostControlOut | None:
    project = await db.get(Project, project_id)
    if not project:
        return None

    wbs_result = await db.execute(
        select(WbsNode)
        .where(WbsNode.project_id == project_id)
        .order_by(WbsNode.sort_order)
    )
    wbs_nodes = wbs_result.scalars().all()

    acc_result = await db.execute(
        select(CostAccount).where(CostAccount.project_id == project_id)
    )
    accounts = acc_result.scalars().all()

    # Load per-period CAP rows when a period is specified.
    # Also record whether the period is closed so we know whether snapshots are available.
    period_actuals: dict[UUID, CostAccountPeriod] = {}
    period_is_closed = False
    if period_code:
        per_result = await db.execute(
            select(Period).where(Period.project_id == project_id, Period.code == period_code)
        )
        period_row = per_result.scalar_one_or_none()
        if period_row:
            period_is_closed = period_row.is_closed
            cap_result = await db.execute(
                select(CostAccountPeriod).where(CostAccountPeriod.period_id == period_row.id)
            )
            for cap in cap_result.scalars().all():
                period_actuals[cap.cost_account_id] = cap

    wbs_code_by_id = {node.id: node.code for node in wbs_nodes}
    all_codes = {node.code for node in wbs_nodes}

    # Accounts grouped by their WBS node code
    accs_by_wbs: dict[str, list[CostAccount]] = {}
    for acc in accounts:
        if acc.wbs_node_id:
            wbs_code = wbs_code_by_id.get(acc.wbs_node_id)
            if wbs_code:
                accs_by_wbs.setdefault(wbs_code, []).append(acc)

    rows: list[WbsRowOut] = []

    for node in wbs_nodes:
        # All accounts in the subtree rooted at this node (for rollup)
        relevant = [
            acc for acc in accounts
            if acc.wbs_node_id
            and (
                wbs_code_by_id.get(acc.wbs_node_id, "") == node.code
                or wbs_code_by_id.get(acc.wbs_node_id, "").startswith(node.code + ".")
            )
        ]

        cost_budget      = sum((a.cost_budget      or D("0")) for a in relevant)
        cost_open_commit = sum((a.cost_open_commit or D("0")) for a in relevant)
        cost_period_incurred = sum(
            (period_actuals[a.id].actual or D("0")) if a.id in period_actuals else D("0")
            for a in relevant
        )

        if period_is_closed:
            # Use period-close snapshots for EVM figures
            def _snap(a: CostAccount, field: str) -> D:
                cap = period_actuals.get(a.id)
                return (getattr(cap, field) or D("0")) if cap else D("0")

            cost_earned = sum(_snap(a, "snap_cost_earned")         for a in relevant)
            cost_actual = sum(_snap(a, "snap_cost_actual_to_date") for a in relevant)
            cost_etc    = sum(_snap(a, "snap_cost_etc")            for a in relevant)
            cost_eac    = sum(_snap(a, "snap_cost_eac")            for a in relevant)
        else:
            cost_earned = sum((a.cost_earned or D("0")) for a in relevant)
            cost_actual = sum((a.cost_actual or D("0")) for a in relevant)
            cost_etc    = sum((a.cost_etc    or D("0")) for a in relevant)
            cost_eac    = sum((a.cost_eac    or D("0")) for a in relevant)

        cpi = (cost_earned / cost_actual).quantize(D("0.0001")) if cost_actual > 0 else D("1.0000")
        vac = cost_budget - cost_eac
        pct_complete = (cost_earned / cost_budget).quantize(D("0.0001")) if cost_budget > 0 else D("0")

        is_rollup = any(c.startswith(node.code + ".") for c in all_codes)

        direct = sorted(accs_by_wbs.get(node.code, []), key=lambda a: a.account_code)
        rows.append(WbsRowOut(
            wbs_node_id=node.id,
            code=node.code,
            description=node.description,
            level=node.level,
            sort_order=node.sort_order,
            is_rollup=is_rollup,
            parent_code=_parent_code(node.code),
            cost_budget=cost_budget,
            cost_earned=cost_earned,
            cost_actual=cost_actual,
            cost_period_incurred=cost_period_incurred,
            cost_open_commit=cost_open_commit,
            cost_etc=cost_etc,
            cost_eac=cost_eac,
            pct_complete=pct_complete,
            cpi=cpi,
            vac=vac,
            account_count=len(relevant),
            account_code=None,
            has_account_children=not is_rollup and len(direct) > 0,
        ))

        # For leaf WBS nodes, append individual cost-account rows immediately after
        if not is_rollup:
            for acc in direct:
                a_budget = acc.cost_budget or D("0")
                a_earned = acc.cost_earned or D("0")
                a_actual = acc.cost_actual or D("0")

                a_etc, a_eac = compute_eac(acc)

                a_cpi = (a_earned / a_actual).quantize(D("0.0001")) if a_actual > 0 else D("1.0000")
                a_vac = a_budget - a_eac
                a_pct = (a_earned / a_budget).quantize(D("0.0001")) if a_budget > 0 else D("0")

                a_cap    = period_actuals.get(acc.id)
                a_budget = acc.cost_budget or D("0")
                a_period_incurred = (a_cap.actual or D("0")) if a_cap else D("0")

                if period_is_closed and a_cap:
                    a_earned = a_cap.snap_cost_earned         or D("0")
                    a_actual = a_cap.snap_cost_actual_to_date or D("0")
                    a_etc    = a_cap.snap_cost_etc            or D("0")
                    a_eac    = a_cap.snap_cost_eac            or D("0")
                    a_pct    = a_cap.snap_pct_complete        or D("0")
                else:
                    a_earned = acc.cost_earned or D("0")
                    a_actual = acc.cost_actual or D("0")
                    a_etc, a_eac = compute_eac(acc)
                    a_pct = (a_earned / a_budget).quantize(D("0.0001")) if a_budget > 0 else D("0")

                a_cpi = (a_earned / a_actual).quantize(D("0.0001")) if a_actual > 0 else D("1.0000")
                a_vac = (acc.cost_budget or D("0")) - a_eac

                rows.append(WbsRowOut(
                    wbs_node_id=acc.id,
                    code=acc.account_code,
                    description=acc.description,
                    level=node.level + 1,
                    sort_order=node.sort_order,
                    is_rollup=False,
                    parent_code=node.code,
                    wbs_node_description=node.description,
                    cost_budget=a_budget,
                    cost_earned=a_earned,
                    cost_actual=a_actual,
                    cost_period_incurred=a_period_incurred,
                    cost_open_commit=acc.cost_open_commit or D("0"),
                    cost_etc=a_etc,
                    cost_eac=a_eac,
                    pct_complete=a_pct,
                    cpi=a_cpi,
                    vac=a_vac,
                    account_count=1,
                    account_code=acc.account_code,
                    etc_method=acc.etc_method.value,
                ))

    return CostControlOut(
        project_id=project.id,
        project_code=project.code,
        project_title=project.title,
        period_is_closed=period_is_closed,
        rows=rows,
    )


async def close_period(project_id: UUID, period_code: str, db: AsyncSession) -> PeriodCloseOut | None:
    """Snapshot ETC/EAC/pct_complete for every cost account into cost_account_periods,
    then mark the period as closed.  Idempotent: re-closing overwrites existing snapshots.
    """
    per_result = await db.execute(
        select(Period).where(Period.project_id == project_id, Period.code == period_code)
    )
    period = per_result.scalar_one_or_none()
    if not period:
        return None

    # All periods up to and including this one (for cumulative AC calculation)
    prev_result = await db.execute(
        select(Period)
        .where(Period.project_id == project_id, Period.code <= period_code)
        .order_by(Period.code)
    )
    prior_period_ids = {p.id for p in prev_result.scalars().all()}

    # All cost_account_periods rows for the project up through this period
    caps_result = await db.execute(
        select(CostAccountPeriod).where(CostAccountPeriod.period_id.in_(prior_period_ids))
    )
    all_caps = caps_result.scalars().all()

    # Cumulative actual per account across all prior periods
    cumul_actual_by_account: dict[UUID, D] = {}
    for cap in all_caps:
        cumul_actual_by_account[cap.cost_account_id] = (
            cumul_actual_by_account.get(cap.cost_account_id, D("0")) + (cap.actual or D("0"))
        )

    # Current-period CAP rows (for upsert)
    current_cap_by_account: dict[UUID, CostAccountPeriod] = {
        cap.cost_account_id: cap for cap in all_caps if cap.period_id == period.id
    }

    acc_result = await db.execute(
        select(CostAccount).where(CostAccount.project_id == project_id)
    )
    accounts = acc_result.scalars().all()

    accounts_closed = 0
    for acc in accounts:
        cumul_ac = cumul_actual_by_account.get(acc.id, D("0"))
        pct      = acc.pct_complete or D("0")
        bac      = acc.cost_bac_control or acc.cost_budget or D("0")
        earned   = (pct * bac).quantize(D("0.01"))
        oc       = acc.cost_open_commit or D("0")

        method = acc.etc_method
        if method == EtcMethod.closed:
            snap_etc = D("0")
            snap_eac = cumul_ac
        elif method == EtcMethod.budget_remaining:
            snap_etc = max(D("0"), bac - earned)
            snap_eac = cumul_ac + snap_etc
        elif method == EtcMethod.performance_factor:
            cpi = (earned / cumul_ac).quantize(D("0.0001")) if cumul_ac > 0 else D("1.0000")
            snap_eac = (bac / cpi).quantize(D("0.01")) if cpi > 0 else bac
            snap_etc = max(D("0"), snap_eac - cumul_ac)
        elif method == EtcMethod.commitments:
            snap_eac = cumul_ac + oc
            snap_etc = max(D("0"), oc)
        else:  # manual
            snap_etc = acc.cost_etc or D("0")
            snap_eac = cumul_ac + snap_etc

        cap = current_cap_by_account.get(acc.id)
        if cap is None:
            cap = CostAccountPeriod(cost_account_id=acc.id, period_id=period.id)
            db.add(cap)

        cap.snap_pct_complete        = pct
        cap.snap_cost_earned         = earned
        cap.snap_cost_actual_to_date = cumul_ac
        cap.snap_cost_etc            = snap_etc
        cap.snap_cost_eac            = snap_eac
        accounts_closed += 1

    period.is_closed = True
    await db.commit()

    return PeriodCloseOut(period_code=period_code, accounts_snapshotted=accounts_closed)
