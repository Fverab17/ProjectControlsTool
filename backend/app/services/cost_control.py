from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import CostAccount, Project, WbsNode
from app.schemas.cost_control import CostControlOut, WbsRowOut

D = Decimal


def _is_descendant_or_self(ancestor: str, code: str) -> bool:
    return code == ancestor or code.startswith(ancestor + ".")


def _parent_code(code: str) -> str | None:
    return code.rsplit(".", 1)[0] if "." in code else None


async def get_cost_control(project_id: UUID, db: AsyncSession) -> CostControlOut | None:
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

    wbs_code_by_id = {node.id: node.code for node in wbs_nodes}
    all_codes = {node.code for node in wbs_nodes}

    rows: list[WbsRowOut] = []

    for node in wbs_nodes:
        relevant = [
            acc for acc in accounts
            if acc.wbs_node_id
            and _is_descendant_or_self(
                node.code,
                wbs_code_by_id.get(acc.wbs_node_id, ""),
            )
        ]

        cost_budget      = sum((a.cost_budget      or D("0")) for a in relevant)
        cost_earned      = sum((a.cost_earned      or D("0")) for a in relevant)
        cost_actual      = sum((a.cost_actual      or D("0")) for a in relevant)
        cost_open_commit = sum((a.cost_open_commit or D("0")) for a in relevant)
        cost_etc         = sum((a.cost_etc         or D("0")) for a in relevant)
        cost_eac         = sum((a.cost_eac         or D("0")) for a in relevant)

        # EVM ratios — always computed, never stored
        cpi = (cost_earned / cost_actual).quantize(D("0.0001")) if cost_actual > 0 else D("1.0000")
        vac = cost_budget - cost_eac
        pct_complete = (cost_earned / cost_budget).quantize(D("0.0001")) if cost_budget > 0 else D("0")

        is_rollup = any(c.startswith(node.code + ".") for c in all_codes)

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
            cost_open_commit=cost_open_commit,
            cost_etc=cost_etc,
            cost_eac=cost_eac,
            pct_complete=pct_complete,
            cpi=cpi,
            vac=vac,
            account_count=len(relevant),
        ))

    return CostControlOut(
        project_id=project.id,
        project_code=project.code,
        project_title=project.title,
        rows=rows,
    )
