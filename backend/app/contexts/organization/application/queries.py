from dataclasses import dataclass, field
from uuid import UUID

from app.shared.application.bus import Query


@dataclass
class GetTenantQuery(Query):
    tenant_id: UUID


@dataclass
class ListTenantsQuery(Query):
    skip: int = 0
    limit: int = 50


@dataclass
class GetAreaQuery(Query):
    area_id: UUID


@dataclass
class ListAreasQuery(Query):
    tenant_id: UUID
    skip: int = 0
    limit: int = 50


@dataclass
class GetSubareaQuery(Query):
    subarea_id: UUID


@dataclass
class ListSubareasQuery(Query):
    area_id: UUID
    skip: int = 0
    limit: int = 50


@dataclass
class GetOrgChartQuery(Query):
    tenant_id: UUID
