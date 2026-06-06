from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import get_db
from app.models import CostAccount, Period, Project, ProjectMember, User, WbsNode
from app.models.changes import ChangeLine, ChangeOrder
from app.models.enums import ChangeCategory, ChangeImpact, ChangeReason, ChangeStatus
from app.schemas.cost_accounts import CostAccountOut
from app.schemas.changes import (
    ChangeLineIn, ChangeLineOut, ChangeLineUpdate,
    ChangeOrderDetailOut, ChangeOrderIn, ChangeOrderOut, ChangeOrderUpdate,
    WbsChangeItemOut,
)
from app.schemas.cost_control import CostControlOut
from app.schemas.projects import ProjectDetailOut, ProjectMemberOut, ProjectOut
from app.services.cost_control import get_cost_control

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
async def cost_control(project_id: UUID, db: AsyncSession = Depends(get_db)):
    data = await get_cost_control(project_id, db)
    if not data:
        raise HTTPException(status_code=404, detail="Project not found")
    return data


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
