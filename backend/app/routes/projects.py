from decimal import Decimal
from uuid import UUID

import csv
import io
from decimal import Decimal as D, InvalidOperation

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import get_db
from app.models import CostAccount, Period, PeriodReport, Project, ProjectMember, User, WbsNode
from app.models.changes import ChangeLine, ChangeOrder
from app.models.enums import ChangeCategory, ChangeImpact, ChangeReason, ChangeStatus, EtcMethod, PctMethod
from app.schemas.cost_accounts import CostAccountOut, CostAccountUpdate
from app.schemas.changes import (
    ChangeLineIn, ChangeLineOut, ChangeLineUpdate,
    ChangeOrderDetailOut, ChangeOrderIn, ChangeOrderOut, ChangeOrderUpdate,
    WbsChangeItemOut,
)
from app.schemas.cost_control import CostControlOut, ImportActualsResult, ImportErrorRow, PeriodCloseOut
from app.schemas.projects import PeriodReportOut, PeriodReportUpsert, ProjectDetailOut, ProjectMemberOut, ProjectOut
from app.services.cost_control import close_period, get_cost_control

router = APIRouter(prefix="/projects", tags=["projects"])


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _co_to_out(co: ChangeOrder, lines: list[ChangeLineOut] | None = None) -> ChangeOrderOut:
    totals_src = lines if lines is not None else co.change_lines
    return ChangeOrderOut(
        id=co.id,
        change_code=co.change_code,
        description=co.description,
        category=co.category.value if co.category else None,
        status=co.status.value,
        reason=co.reason.value if co.reason else None,
        impact=co.impact.value,
        request_date=co.request_date,
        issued_date=co.issued_date,
        approved_date=co.approved_date,
        scope_notes=co.scope_notes,
        added_days=float(co.added_days) if co.added_days is not None else None,
        pct_complete=float(co.pct_complete) if co.pct_complete is not None else None,
        total_hour_impact=sum(float(getattr(l, 'hour_impact', 0) or 0) for l in totals_src),
        total_cost_impact=sum(float(getattr(l, 'cost_impact', 0) or 0) for l in totals_src),
    )


# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------

@router.get("", response_model=list[ProjectOut])
async def list_projects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).order_by(Project.code))
    return result.scalars().all()


@router.get("/{project_id}", response_model=ProjectDetailOut)
async def get_project(project_id: UUID, db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    members_result = await db.execute(
        select(ProjectMember, User)
        .join(User, ProjectMember.user_id == User.id)
        .where(ProjectMember.project_id == project_id)
    )
    member_rows = members_result.all()

    period_count = await db.scalar(select(func.count()).where(Period.project_id == project_id))
    account_count = await db.scalar(select(func.count()).where(CostAccount.project_id == project_id))
    wbs_count = await db.scalar(select(func.count()).where(WbsNode.project_id == project_id))

    members = [
        ProjectMemberOut(
            id=pm.id, user_id=pm.user_id,
            user_name=user.name, user_email=user.email,
            project_role=pm.project_role.value,
        )
        for pm, user in member_rows
    ]

    return ProjectDetailOut(
        **ProjectOut.model_validate(project).model_dump(),
        members=members,
        period_count=period_count or 0,
        account_count=account_count or 0,
        wbs_node_count=wbs_count or 0,
    )


@router.get("/{project_id}/cost-accounts", response_model=list[CostAccountOut])
async def list_cost_accounts(project_id: UUID, db: AsyncSession = Depends(get_db)):
    """All cost accounts for a project with full attributes and computed EVM metrics."""
    from app.models.breakdown import CbsNode, WbsNode as WbsNodeModel
    result = await db.execute(
        select(CostAccount)
        .where(CostAccount.project_id == project_id)
        .options(
            selectinload(CostAccount.wbs_node),
            selectinload(CostAccount.cbs_node),
        )
        .order_by(CostAccount.account_code)
    )
    accounts = result.scalars().all()

    out = []
    for a in accounts:
        budget = float(a.cost_budget or 0)
        earned = float(a.cost_earned or 0)
        actual = float(a.cost_actual or 0)
        eac    = float(a.cost_eac    or 0)

        cpi = round(earned / actual, 4) if actual > 0 else 1.0
        spi = round(earned / budget, 4) if budget > 0 else 1.0
        vac = budget - eac

        out.append(CostAccountOut(
            id=a.id,
            account_code=a.account_code,
            description=a.description,
            discipline=a.discipline,
            wbs_code=a.wbs_node.code if a.wbs_node else None,
            wbs_description=a.wbs_node.description if a.wbs_node else None,
            cbs_code=a.cbs_node.code if a.cbs_node else None,
            cbs_description=a.cbs_node.description if a.cbs_node else None,
            pct_complete=float(a.pct_complete or 0),
            pct_complete_method=a.pct_complete_method.value,
            etc_method=a.etc_method.value,
            currency_code=a.currency_code,
            baseline_start=a.baseline_start,
            baseline_finish=a.baseline_finish,
            control_start=a.control_start,
            control_finish=a.control_finish,
            cost_budget=budget,
            cost_earned=earned,
            cost_actual=actual,
            cost_incurred=float(a.cost_incurred or 0),
            cost_commitment=float(a.cost_commitment or 0),
            cost_open_commit=float(a.cost_open_commit or 0),
            cost_etc=float(a.cost_etc or 0),
            cost_eac=eac,
            hour_budget=float(a.hour_budget or 0),
            hour_earned=float(a.hour_earned or 0),
            hour_actual=float(a.hour_actual or 0),
            hour_etc=float(a.hour_etc or 0),
            hour_eac=float(a.hour_eac or 0),
            cost_bac_baseline=float(a.cost_bac_baseline or 0),
            cost_bac_approved=float(a.cost_bac_approved or 0),
            cost_bac_control=float(a.cost_bac_control or 0),
            cost_bac_changes=float(a.cost_bac_changes or 0),
            cpi=cpi,
            spi=spi,
            vac=vac,
            cf_adv_pay_pct=float(a.cf_adv_pay_pct or 0),
            cf_retention_pct=float(a.cf_retention_pct or 0),
            cash_flow_lag=a.cash_flow_lag or 0,
        ))
    return out


@router.get("/{project_id}/cost-control", response_model=CostControlOut)
async def cost_control(
    project_id: UUID,
    period: str | None = Query(None, description="Period code, e.g. 2024-04"),
    db: AsyncSession = Depends(get_db),
):
    data = await get_cost_control(project_id, db, period_code=period)
    if not data:
        raise HTTPException(status_code=404, detail="Project not found")
    return data


@router.post("/{project_id}/periods/{period_code}/close", response_model=PeriodCloseOut)
async def close_period_route(
    project_id: UUID,
    period_code: str,
    db: AsyncSession = Depends(get_db),
):
    """Snapshot ETC/EAC/% complete for all cost accounts into cost_account_periods
    and mark the period as closed.  Safe to call more than once — re-closing
    overwrites the previous snapshot with current values.
    """
    result = await close_period(project_id, period_code, db)
    if not result:
        raise HTTPException(status_code=404, detail="Period not found")
    return result


@router.post("/{project_id}/periods/{period_code}/import/actuals", response_model=ImportActualsResult)
async def import_period_actuals(
    project_id: UUID,
    period_code: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Import actual costs from a CSV file into cost_account_periods for the given period.

    Expected CSV format (UTF-8, with header row):
        account_code,actual_cost
        1.1.1,125000.00
    """
    # Resolve period
    per_result = await db.execute(
        select(Period).where(Period.project_id == project_id, Period.code == period_code)
    )
    period = per_result.scalar_one_or_none()
    if not period:
        raise HTTPException(status_code=404, detail="Period not found")

    # Parse CSV
    raw = await file.read()
    try:
        text = raw.decode('utf-8-sig')   # strips BOM if present
    except UnicodeDecodeError:
        text = raw.decode('latin-1')

    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames is None or not {'account_code', 'actual_cost'}.issubset(
        {f.strip().lower() for f in reader.fieldnames}
    ):
        raise HTTPException(
            status_code=422,
            detail="CSV must have columns: account_code, actual_cost",
        )

    # Normalise header names (case-insensitive)
    rows = [{k.strip().lower(): v.strip() for k, v in row.items()} for row in reader]

    # Load all accounts for fast lookup
    acc_result = await db.execute(
        select(CostAccount).where(CostAccount.project_id == project_id)
    )
    acc_by_code = {a.account_code: a for a in acc_result.scalars().all()}

    # Load existing CAP rows for this period
    cap_result = await db.execute(
        select(CostAccountPeriod).where(CostAccountPeriod.period_id == period.id)
    )
    cap_by_account: dict[UUID, CostAccountPeriod] = {
        c.cost_account_id: c for c in cap_result.scalars().all()
    }

    imported = 0
    skipped = 0
    errors: list[ImportErrorRow] = []
    affected_account_ids: set[UUID] = set()

    for i, row in enumerate(rows, start=2):   # row 1 = header
        code = row.get('account_code', '').strip()
        raw_val = row.get('actual_cost', '').strip()

        if not code:
            skipped += 1
            continue

        account = acc_by_code.get(code)
        if account is None:
            errors.append(ImportErrorRow(row=i, account_code=code, message="Account not found"))
            skipped += 1
            continue

        try:
            actual_val = D(raw_val)
        except InvalidOperation:
            errors.append(ImportErrorRow(row=i, account_code=code, message=f"Invalid amount: {raw_val!r}"))
            skipped += 1
            continue

        cap = cap_by_account.get(account.id)
        if cap is None:
            cap = CostAccountPeriod(cost_account_id=account.id, period_id=period.id)
            db.add(cap)
            cap_by_account[account.id] = cap

        cap.actual = actual_val
        affected_account_ids.add(account.id)
        imported += 1

    # Recalculate cost_accounts.cost_actual (sum of all periods) for affected accounts
    for account_id in affected_account_ids:
        total = await db.scalar(
            select(func.coalesce(func.sum(CostAccountPeriod.actual), 0))
            .where(CostAccountPeriod.cost_account_id == account_id)
        )
        await db.execute(
            update(CostAccount)
            .where(CostAccount.id == account_id)
            .values(cost_actual=total)
        )

    await db.commit()

    return ImportActualsResult(
        period_code=period_code,
        imported=imported,
        skipped=skipped,
        errors=errors,
    )


@router.post("/{project_id}/import/actuals/history", response_model=ImportActualsResult)
async def import_actuals_history(
    project_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Import historical actuals from a multi-period CSV.

    Expected CSV format (UTF-8, with header row):
        period_code,account_code,actual_cost
        2024-01,1.1.1,110000.00
        2024-02,1.1.1,115000.00

    Does NOT close or snapshot any periods — that remains a manual step.
    """
    raw = await file.read()
    try:
        text = raw.decode('utf-8-sig')
    except UnicodeDecodeError:
        text = raw.decode('latin-1')

    reader = csv.DictReader(io.StringIO(text))
    required = {'period_code', 'account_code', 'actual_cost'}
    if reader.fieldnames is None or not required.issubset(
        {f.strip().lower() for f in reader.fieldnames}
    ):
        raise HTTPException(status_code=422, detail="CSV must have columns: period_code, account_code, actual_cost")

    rows = [{k.strip().lower(): v.strip() for k, v in row.items()} for row in reader]

    # Load all accounts and periods for this project up front
    acc_result = await db.execute(select(CostAccount).where(CostAccount.project_id == project_id))
    acc_by_code = {a.account_code: a for a in acc_result.scalars().all()}

    per_result = await db.execute(select(Period).where(Period.project_id == project_id))
    period_by_code = {p.code: p for p in per_result.scalars().all()}

    # Load all existing CAPs for this project
    all_cap_result = await db.execute(
        select(CostAccountPeriod).where(
            CostAccountPeriod.period_id.in_({p.id for p in period_by_code.values()})
        )
    )
    # Keyed by (account_id, period_id)
    cap_map: dict[tuple, CostAccountPeriod] = {}
    for c in all_cap_result.scalars().all():
        cap_map[(c.cost_account_id, c.period_id)] = c

    imported = 0
    skipped = 0
    errors: list[ImportErrorRow] = []
    affected_account_ids: set[UUID] = set()
    affected_period_codes: set[str] = set()

    for i, row in enumerate(rows, start=2):
        pcode    = row.get('period_code', '').strip()
        acode    = row.get('account_code', '').strip()
        raw_val  = row.get('actual_cost', '').strip()

        if not pcode or not acode:
            skipped += 1
            continue

        period = period_by_code.get(pcode)
        if period is None:
            errors.append(ImportErrorRow(row=i, account_code=acode, message=f"Period '{pcode}' not found"))
            skipped += 1
            continue

        account = acc_by_code.get(acode)
        if account is None:
            errors.append(ImportErrorRow(row=i, account_code=acode, message="Account not found"))
            skipped += 1
            continue

        try:
            actual_val = D(raw_val)
        except InvalidOperation:
            errors.append(ImportErrorRow(row=i, account_code=acode, message=f"Invalid amount: {raw_val!r}"))
            skipped += 1
            continue

        key = (account.id, period.id)
        cap = cap_map.get(key)
        if cap is None:
            cap = CostAccountPeriod(cost_account_id=account.id, period_id=period.id)
            db.add(cap)
            cap_map[key] = cap

        cap.actual = actual_val
        affected_account_ids.add(account.id)
        affected_period_codes.add(pcode)
        imported += 1

    # Recalculate cost_accounts.cost_actual for every affected account
    for account_id in affected_account_ids:
        total = await db.scalar(
            select(func.coalesce(func.sum(CostAccountPeriod.actual), 0))
            .where(CostAccountPeriod.cost_account_id == account_id)
        )
        await db.execute(
            update(CostAccount).where(CostAccount.id == account_id).values(cost_actual=total)
        )

    await db.commit()

    return ImportActualsResult(
        period_code='',
        periods_affected=len(affected_period_codes),
        imported=imported,
        skipped=skipped,
        errors=errors,
    )


@router.patch("/{project_id}/cost-accounts/{account_id}", response_model=CostAccountOut)
async def update_cost_account(
    project_id: UUID,
    account_id: UUID,
    body: CostAccountUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update ETC forecasting method (and optionally % complete / manual ETC).
    Recomputes and persists cost_etc and cost_eac based on the chosen method.
    """
    from app.services.cost_control import compute_eac

    result = await db.execute(
        select(CostAccount)
        .where(CostAccount.project_id == project_id, CostAccount.id == account_id)
        .options(selectinload(CostAccount.wbs_node), selectinload(CostAccount.cbs_node))
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Cost account not found")

    if body.etc_method is not None:
        try:
            account.etc_method = EtcMethod(body.etc_method)
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid etc_method: {body.etc_method}")

    if body.pct_complete_method is not None:
        try:
            account.pct_complete_method = PctMethod(body.pct_complete_method)
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid pct_complete_method: {body.pct_complete_method}")

    if body.pct_complete is not None:
        from decimal import Decimal as D
        account.pct_complete = D(str(body.pct_complete))
        account.cost_earned = (account.cost_budget or D("0")) * account.pct_complete

    if body.cost_etc is not None and account.etc_method == EtcMethod.manual:
        from decimal import Decimal as D
        account.cost_etc = D(str(body.cost_etc))

    # Recompute ETC + EAC from the (possibly updated) method
    new_etc, new_eac = compute_eac(account)
    account.cost_etc = new_etc
    account.cost_eac = new_eac

    await db.commit()
    await db.refresh(account)

    budget = float(account.cost_budget or 0)
    earned = float(account.cost_earned or 0)
    actual = float(account.cost_actual or 0)
    eac    = float(account.cost_eac    or 0)
    cpi    = round(earned / actual, 4) if actual > 0 else 1.0

    return CostAccountOut(
        id=account.id,
        account_code=account.account_code,
        description=account.description,
        discipline=account.discipline,
        wbs_code=account.wbs_node.code if account.wbs_node else None,
        wbs_description=account.wbs_node.description if account.wbs_node else None,
        cbs_code=account.cbs_node.code if account.cbs_node else None,
        cbs_description=account.cbs_node.description if account.cbs_node else None,
        pct_complete=float(account.pct_complete or 0),
        pct_complete_method=account.pct_complete_method.value,
        etc_method=account.etc_method.value,
        currency_code=account.currency_code,
        baseline_start=account.baseline_start,
        baseline_finish=account.baseline_finish,
        control_start=account.control_start,
        control_finish=account.control_finish,
        cost_budget=budget,
        cost_earned=earned,
        cost_actual=actual,
        cost_incurred=float(account.cost_incurred or 0),
        cost_commitment=float(account.cost_commitment or 0),
        cost_open_commit=float(account.cost_open_commit or 0),
        cost_etc=float(account.cost_etc or 0),
        cost_eac=eac,
        hour_budget=float(account.hour_budget or 0),
        hour_earned=float(account.hour_earned or 0),
        hour_actual=float(account.hour_actual or 0),
        hour_etc=float(account.hour_etc or 0),
        hour_eac=float(account.hour_eac or 0),
        cost_bac_baseline=float(account.cost_bac_baseline or 0),
        cost_bac_approved=float(account.cost_bac_approved or 0),
        cost_bac_control=float(account.cost_bac_control or 0),
        cost_bac_changes=float(account.cost_bac_changes or 0),
        cpi=cpi,
        spi=round(earned / budget, 4) if budget > 0 else 1.0,
        vac=budget - eac,
        cf_adv_pay_pct=float(account.cf_adv_pay_pct or 0),
        cf_retention_pct=float(account.cf_retention_pct or 0),
        cash_flow_lag=account.cash_flow_lag or 0,
    )


# ---------------------------------------------------------------------------
# Change orders
# ---------------------------------------------------------------------------

@router.get("/{project_id}/change-orders", response_model=list[ChangeOrderOut])
async def list_change_orders(project_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ChangeOrder)
        .where(ChangeOrder.project_id == project_id)
        .options(selectinload(ChangeOrder.change_lines))
        .order_by(ChangeOrder.change_code)
    )
    return [_co_to_out(co) for co in result.scalars().all()]


@router.get("/{project_id}/change-orders/{co_id}", response_model=ChangeOrderDetailOut)
async def get_change_order(project_id: UUID, co_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ChangeOrder)
        .where(ChangeOrder.project_id == project_id, ChangeOrder.id == co_id)
        .options(selectinload(ChangeOrder.change_lines).selectinload(ChangeLine.cost_account))
    )
    co = result.scalar_one_or_none()
    if not co:
        raise HTTPException(status_code=404, detail="Change order not found")

    lines = [
        ChangeLineOut(
            id=l.id,
            cost_account_id=l.cost_account_id,
            cost_account_code=l.cost_account.account_code,
            cost_account_description=l.cost_account.description,
            hour_impact=float(l.hour_impact or 0),
            cost_impact=float(l.cost_impact or 0),
        )
        for l in co.change_lines
    ]
    base = _co_to_out(co, lines)
    return ChangeOrderDetailOut(**base.model_dump(), lines=lines)


@router.post("/{project_id}/change-orders/{co_id}/lines", response_model=ChangeLineOut, status_code=201)
async def add_change_line(
    project_id: UUID, co_id: UUID, body: ChangeLineIn, db: AsyncSession = Depends(get_db)
):
    co = await db.get(ChangeOrder, co_id)
    if not co or co.project_id != project_id:
        raise HTTPException(status_code=404, detail="Change order not found")

    acc_result = await db.execute(
        select(CostAccount).where(
            CostAccount.project_id == project_id,
            CostAccount.account_code == body.account_code,
        )
    )
    account = acc_result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail=f"Cost account '{body.account_code}' not found")

    line = ChangeLine(
        change_order_id=co_id,
        cost_account_id=account.id,
        hour_impact=Decimal(str(body.hour_impact)),
        cost_impact=Decimal(str(body.cost_impact)),
    )
    db.add(line)
    await db.commit()
    await db.refresh(line)
    return ChangeLineOut(
        id=line.id,
        cost_account_id=account.id,
        cost_account_code=account.account_code,
        cost_account_description=account.description,
        hour_impact=float(line.hour_impact or 0),
        cost_impact=float(line.cost_impact or 0),
    )


@router.patch("/{project_id}/change-orders/{co_id}/lines/{line_id}", response_model=ChangeLineOut)
async def update_change_line(
    project_id: UUID, co_id: UUID, line_id: UUID, body: ChangeLineUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ChangeLine)
        .where(ChangeLine.id == line_id, ChangeLine.change_order_id == co_id)
        .options(selectinload(ChangeLine.cost_account))
    )
    line = result.scalar_one_or_none()
    if not line:
        raise HTTPException(status_code=404, detail="Change line not found")

    if body.hour_impact is not None:
        line.hour_impact = Decimal(str(body.hour_impact))
    if body.cost_impact is not None:
        line.cost_impact = Decimal(str(body.cost_impact))

    await db.commit()
    await db.refresh(line)
    return ChangeLineOut(
        id=line.id,
        cost_account_id=line.cost_account_id,
        cost_account_code=line.cost_account.account_code,
        cost_account_description=line.cost_account.description,
        hour_impact=float(line.hour_impact or 0),
        cost_impact=float(line.cost_impact or 0),
    )


@router.delete("/{project_id}/change-orders/{co_id}/lines/{line_id}", status_code=204)
async def delete_change_line(
    project_id: UUID, co_id: UUID, line_id: UUID, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ChangeLine).where(ChangeLine.id == line_id, ChangeLine.change_order_id == co_id)
    )
    line = result.scalar_one_or_none()
    if not line:
        raise HTTPException(status_code=404, detail="Change line not found")
    await db.delete(line)
    await db.commit()


@router.post("/{project_id}/change-orders", response_model=ChangeOrderOut, status_code=201)
async def create_change_order(
    project_id: UUID, body: ChangeOrderIn, db: AsyncSession = Depends(get_db)
):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        status = ChangeStatus(body.status)
        impact = ChangeImpact(body.impact)
        reason = ChangeReason(body.reason) if body.reason else None
        category = ChangeCategory(body.category) if body.category else None
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    co = ChangeOrder(
        project_id=project_id,
        change_code=body.change_code,
        description=body.description,
        category=category,
        status=status,
        reason=reason,
        impact=impact,
        request_date=body.request_date,
        issued_date=body.issued_date,
        approved_date=body.approved_date,
        scope_notes=body.scope_notes,
        added_days=Decimal(str(body.added_days)) if body.added_days is not None else None,
        pct_complete=Decimal(str(body.pct_complete)) if body.pct_complete is not None else None,
    )
    db.add(co)
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Change code already exists in this project")
    await db.refresh(co)
    # New order has no lines — construct directly to avoid lazy-load in async context
    return ChangeOrderOut(
        id=co.id,
        change_code=co.change_code,
        description=co.description,
        category=co.category.value if co.category else None,
        status=co.status.value,
        reason=co.reason.value if co.reason else None,
        impact=co.impact.value,
        request_date=co.request_date,
        issued_date=co.issued_date,
        approved_date=co.approved_date,
        scope_notes=co.scope_notes,
        added_days=float(co.added_days) if co.added_days is not None else None,
        pct_complete=float(co.pct_complete) if co.pct_complete is not None else None,
        total_hour_impact=0.0,
        total_cost_impact=0.0,
    )


@router.patch("/{project_id}/change-orders/{co_id}", response_model=ChangeOrderOut)
async def update_change_order(
    project_id: UUID, co_id: UUID, body: ChangeOrderUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ChangeOrder)
        .where(ChangeOrder.project_id == project_id, ChangeOrder.id == co_id)
        .options(selectinload(ChangeOrder.change_lines))
    )
    co = result.scalar_one_or_none()
    if not co:
        raise HTTPException(status_code=404, detail="Change order not found")

    try:
        if body.status is not None:
            co.status = ChangeStatus(body.status)
        if body.impact is not None:
            co.impact = ChangeImpact(body.impact)
        if body.reason is not None:
            co.reason = ChangeReason(body.reason)
        if body.category is not None:
            co.category = ChangeCategory(body.category)
        elif 'category' in body.model_fields_set:
            co.category = None
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    if body.description is not None:
        co.description = body.description
    if body.request_date is not None:
        co.request_date = body.request_date
    elif 'request_date' in body.model_fields_set:
        co.request_date = None
    if body.issued_date is not None:
        co.issued_date = body.issued_date
    elif 'issued_date' in body.model_fields_set:
        co.issued_date = None
    if body.approved_date is not None:
        co.approved_date = body.approved_date
    elif 'approved_date' in body.model_fields_set:
        co.approved_date = None
    if body.scope_notes is not None:
        co.scope_notes = body.scope_notes
    elif 'scope_notes' in body.model_fields_set:
        co.scope_notes = None
    if body.added_days is not None:
        co.added_days = Decimal(str(body.added_days))
    if body.pct_complete is not None:
        co.pct_complete = Decimal(str(body.pct_complete))

    await db.commit()
    await db.refresh(co)
    return _co_to_out(co)


@router.get("/{project_id}/account-changes", response_model=list[WbsChangeItemOut])
async def account_changes(project_id: UUID, account_code: str, db: AsyncSession = Depends(get_db)):
    """Return change orders that affect a specific cost account."""
    acc_id_row = await db.execute(
        select(CostAccount.id).where(
            CostAccount.project_id == project_id,
            CostAccount.account_code == account_code,
        )
    )
    account_id = acc_id_row.scalar_one_or_none()
    if not account_id:
        return []

    result = await db.execute(
        select(
            ChangeOrder,
            func.coalesce(func.sum(ChangeLine.cost_impact), 0).label("total_cost"),
            func.coalesce(func.sum(ChangeLine.hour_impact), 0).label("total_hours"),
        )
        .join(ChangeLine, ChangeLine.change_order_id == ChangeOrder.id)
        .where(ChangeLine.cost_account_id == account_id)
        .group_by(ChangeOrder.id)
        .order_by(ChangeOrder.change_code)
    )
    return [
        WbsChangeItemOut(
            change_code=co.change_code,
            description=co.description,
            status=co.status.value,
            total_cost_impact=float(cost),
            total_hour_impact=float(hours),
            request_date=co.request_date,
        )
        for co, cost, hours in result.all()
    ]


@router.get("/{project_id}/wbs-changes", response_model=list[WbsChangeItemOut])
async def wbs_changes(project_id: UUID, wbs_code: str, db: AsyncSession = Depends(get_db)):
    """Return change orders that affect cost accounts under the given WBS code (prefix match)."""
    wbs_id_rows = await db.execute(
        select(WbsNode.id).where(
            WbsNode.project_id == project_id,
            or_(WbsNode.code == wbs_code, WbsNode.code.like(wbs_code + ".%")),
        )
    )
    wbs_ids = [r for r, in wbs_id_rows.all()]
    if not wbs_ids:
        return []

    acc_id_rows = await db.execute(
        select(CostAccount.id).where(
            CostAccount.project_id == project_id,
            CostAccount.wbs_node_id.in_(wbs_ids),
        )
    )
    account_ids = [r for r, in acc_id_rows.all()]
    if not account_ids:
        return []

    result = await db.execute(
        select(
            ChangeOrder,
            func.coalesce(func.sum(ChangeLine.cost_impact), 0).label("total_cost"),
            func.coalesce(func.sum(ChangeLine.hour_impact), 0).label("total_hours"),
        )
        .join(ChangeLine, ChangeLine.change_order_id == ChangeOrder.id)
        .where(ChangeLine.cost_account_id.in_(account_ids))
        .group_by(ChangeOrder.id)
        .order_by(ChangeOrder.change_code)
    )
    return [
        WbsChangeItemOut(
            change_code=co.change_code,
            description=co.description,
            status=co.status.value,
            total_cost_impact=float(cost),
            total_hour_impact=float(hours),
            request_date=co.request_date,
        )
        for co, cost, hours in result.all()
    ]


# ---------------------------------------------------------------------------
# Period Reports
# ---------------------------------------------------------------------------

@router.get("/{project_id}/periods/{period_code}/report", response_model=PeriodReportOut)
async def get_period_report(project_id: UUID, period_code: str, db: AsyncSession = Depends(get_db)):
    row = await db.scalar(
        select(PeriodReport).where(
            PeriodReport.project_id == project_id,
            PeriodReport.period_code == period_code,
        )
    )
    if not row:
        return PeriodReportOut(
            period_code=period_code,
            status_color="green",
            status_narrative=None,
            risks_narrative=None,
            learnings_narrative=None,
        )
    return row


@router.put("/{project_id}/periods/{period_code}/report", response_model=PeriodReportOut)
async def upsert_period_report(
    project_id: UUID,
    period_code: str,
    body: PeriodReportUpsert,
    db: AsyncSession = Depends(get_db),
):
    row = await db.scalar(
        select(PeriodReport).where(
            PeriodReport.project_id == project_id,
            PeriodReport.period_code == period_code,
        )
    )
    if row:
        row.status_color = body.status_color
        row.status_narrative = body.status_narrative
        row.risks_narrative = body.risks_narrative
        row.learnings_narrative = body.learnings_narrative
    else:
        from uuid import uuid4
        row = PeriodReport(
            id=uuid4(),
            project_id=project_id,
            period_code=period_code,
            status_color=body.status_color,
            status_narrative=body.status_narrative,
            risks_narrative=body.risks_narrative,
            learnings_narrative=body.learnings_narrative,
        )
        db.add(row)
    await db.commit()
    await db.refresh(row)
    return row
