from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import Project
from app.schemas.cost_control import CostControlOut
from app.schemas.projects import ProjectOut
from app.services.cost_control import get_cost_control

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[ProjectOut])
async def list_projects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).order_by(Project.code))
    return result.scalars().all()


@router.get("/{project_id}/cost-control", response_model=CostControlOut)
async def cost_control(project_id: UUID, db: AsyncSession = Depends(get_db)):
    data = await get_cost_control(project_id, db)
    if not data:
        raise HTTPException(status_code=404, detail="Project not found")
    return data
