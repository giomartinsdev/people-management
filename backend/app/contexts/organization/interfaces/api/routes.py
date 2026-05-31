from typing import List
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.shared.application.bus import command_bus, query_bus
from app.shared.domain.value_objects import Address, Location
from app.shared.exceptions import EntityNotFoundError

from ...application.commands import (
    CreateAreaCommand,
    CreateSubareaCommand,
    CreateTenantCommand,
    DeleteAreaCommand,
    DeleteSubareaCommand,
    DeleteTenantCommand,
    UpdateAreaCommand,
    UpdateSubareaCommand,
    UpdateTenantCommand,
)
from ...application.queries import (
    GetAreaQuery,
    GetOrgChartQuery,
    GetSubareaQuery,
    GetTenantQuery,
    ListAreasQuery,
    ListSubareasQuery,
    ListTenantsQuery,
)
from ...domain.entities import Area, Subarea, Tenant
from .schemas import (
    AreaCreateRequest,
    AreaResponse,
    AreaUpdateRequest,
    OrgChartNode,
    OrgChartResponse,
    SubareaCreateRequest,
    SubareaResponse,
    SubareaUpdateRequest,
    TenantCreateRequest,
    TenantResponse,
    TenantUpdateRequest,
)

router = APIRouter()


def _tenant_to_response(t: Tenant) -> TenantResponse:
    return TenantResponse(
        id=t.id,
        name=t.name,
        document=t.document,
        email=t.email,
        addresses=[a.to_dict() for a in t.addresses],
        location=t.location.to_dict() if t.location else None,
        created_at=t.created_at,
        updated_at=t.updated_at,
        deleted_at=t.deleted_at,
    )


def _area_to_response(a: Area) -> AreaResponse:
    return AreaResponse(
        id=a.id,
        name=a.name,
        tenant_id=a.tenant_id,
        created_at=a.created_at,
        updated_at=a.updated_at,
        deleted_at=a.deleted_at,
    )


def _subarea_to_response(s: Subarea) -> SubareaResponse:
    return SubareaResponse(
        id=s.id,
        name=s.name,
        area_id=s.area_id,
        created_at=s.created_at,
        updated_at=s.updated_at,
        deleted_at=s.deleted_at,
    )


@router.post("/tenants", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
async def create_tenant(body: TenantCreateRequest):
    cmd = CreateTenantCommand(
        name=body.name,
        document=body.document,
        email=body.email,
        addresses=[Address(**a.model_dump()) for a in body.addresses],
        location=Location(**body.location.model_dump()) if body.location else None,
    )
    tenant = await command_bus.dispatch(cmd)
    return _tenant_to_response(tenant)


@router.get("/tenants", response_model=List[TenantResponse])
async def list_tenants(skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200)):
    tenants = await query_bus.dispatch(ListTenantsQuery(skip=skip, limit=limit))
    return [_tenant_to_response(t) for t in tenants]


@router.get("/tenants/{tenant_id}", response_model=TenantResponse)
async def get_tenant(tenant_id: UUID):
    try:
        tenant = await query_bus.dispatch(GetTenantQuery(tenant_id=tenant_id))
    except EntityNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
    return _tenant_to_response(tenant)


@router.put("/tenants/{tenant_id}", response_model=TenantResponse)
async def update_tenant(tenant_id: UUID, body: TenantUpdateRequest):
    try:
        cmd = UpdateTenantCommand(
            tenant_id=tenant_id,
            name=body.name,
            document=body.document,
            email=body.email,
            addresses=[Address(**a.model_dump()) for a in body.addresses] if body.addresses else None,
            location=Location(**body.location.model_dump()) if body.location else None,
        )
        tenant = await command_bus.dispatch(cmd)
    except EntityNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
    return _tenant_to_response(tenant)


@router.delete("/tenants/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tenant(tenant_id: UUID):
    try:
        await command_bus.dispatch(DeleteTenantCommand(tenant_id=tenant_id))
    except EntityNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)


@router.get("/tenants/{tenant_id}/org-chart", response_model=OrgChartResponse)
async def get_org_chart(tenant_id: UUID):
    try:
        result = await query_bus.dispatch(GetOrgChartQuery(tenant_id=tenant_id))
    except EntityNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
    return result


@router.post("/tenants/{tenant_id}/areas", response_model=AreaResponse, status_code=status.HTTP_201_CREATED)
async def create_area(tenant_id: UUID, body: AreaCreateRequest):
    try:
        area = await command_bus.dispatch(CreateAreaCommand(tenant_id=tenant_id, name=body.name))
    except EntityNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
    return _area_to_response(area)


@router.get("/tenants/{tenant_id}/areas", response_model=List[AreaResponse])
async def list_areas(
    tenant_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    areas = await query_bus.dispatch(ListAreasQuery(tenant_id=tenant_id, skip=skip, limit=limit))
    return [_area_to_response(a) for a in areas]


@router.get("/areas/{area_id}", response_model=AreaResponse)
async def get_area(area_id: UUID):
    try:
        area = await query_bus.dispatch(GetAreaQuery(area_id=area_id))
    except EntityNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
    return _area_to_response(area)


@router.put("/areas/{area_id}", response_model=AreaResponse)
async def update_area(area_id: UUID, body: AreaUpdateRequest):
    try:
        area = await command_bus.dispatch(UpdateAreaCommand(area_id=area_id, name=body.name))
    except EntityNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
    return _area_to_response(area)


@router.delete("/areas/{area_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_area(area_id: UUID):
    try:
        await command_bus.dispatch(DeleteAreaCommand(area_id=area_id))
    except EntityNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)


@router.post("/areas/{area_id}/subareas", response_model=SubareaResponse, status_code=status.HTTP_201_CREATED)
async def create_subarea(area_id: UUID, body: SubareaCreateRequest):
    try:
        subarea = await command_bus.dispatch(CreateSubareaCommand(area_id=area_id, name=body.name))
    except EntityNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
    return _subarea_to_response(subarea)


@router.get("/areas/{area_id}/subareas", response_model=List[SubareaResponse])
async def list_subareas(
    area_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    subareas = await query_bus.dispatch(
        ListSubareasQuery(area_id=area_id, skip=skip, limit=limit)
    )
    return [_subarea_to_response(s) for s in subareas]


@router.get("/subareas/{subarea_id}", response_model=SubareaResponse)
async def get_subarea(subarea_id: UUID):
    try:
        subarea = await query_bus.dispatch(GetSubareaQuery(subarea_id=subarea_id))
    except EntityNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
    return _subarea_to_response(subarea)


@router.put("/subareas/{subarea_id}", response_model=SubareaResponse)
async def update_subarea(subarea_id: UUID, body: SubareaUpdateRequest):
    try:
        subarea = await command_bus.dispatch(
            UpdateSubareaCommand(subarea_id=subarea_id, name=body.name)
        )
    except EntityNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
    return _subarea_to_response(subarea)


@router.delete("/subareas/{subarea_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subarea(subarea_id: UUID):
    try:
        await command_bus.dispatch(DeleteSubareaCommand(subarea_id=subarea_id))
    except EntityNotFoundError as e:
        raise HTTPException(status_code=404, detail=e.message)
