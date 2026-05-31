import json
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

import asyncpg

from app.shared.domain.value_objects import Address, Location
from app.shared.infrastructure.age_repository import AgeRepository
from ..domain.entities import Area, Subarea, Tenant
from ..domain.repositories import AreaRepository, SubareaRepository, TenantRepository


def _dt(value: str | None) -> datetime | None:
    if value is None:
        return None
    return datetime.fromisoformat(value)


def _tenant_from_props(props: dict) -> Tenant:
    addresses_raw = props.get("addresses") or []
    if isinstance(addresses_raw, str):
        addresses_raw = json.loads(addresses_raw)
    addresses = [Address.from_dict(a) for a in addresses_raw]

    location_raw = props.get("location")
    if isinstance(location_raw, str):
        location_raw = json.loads(location_raw)
    location = Location.from_dict(location_raw) if location_raw else None

    return Tenant(
        id=UUID(props["id"]),
        name=props["name"],
        document=props["document"],
        email=props["email"],
        addresses=addresses,
        location=location,
        created_at=_dt(props.get("created_at")),
        updated_at=_dt(props.get("updated_at")),
        deleted_at=_dt(props.get("deleted_at")),
    )


def _area_from_props(props: dict) -> Area:
    return Area(
        id=UUID(props["id"]),
        name=props["name"],
        tenant_id=UUID(props["tenant_id"]),
        created_at=_dt(props.get("created_at")),
        updated_at=_dt(props.get("updated_at")),
        deleted_at=_dt(props.get("deleted_at")),
    )


def _subarea_from_props(props: dict) -> Subarea:
    return Subarea(
        id=UUID(props["id"]),
        name=props["name"],
        area_id=UUID(props["area_id"]),
        created_at=_dt(props.get("created_at")),
        updated_at=_dt(props.get("updated_at")),
        deleted_at=_dt(props.get("deleted_at")),
    )


class AgeTenantRepository(AgeRepository, TenantRepository):
    def __init__(self, pool: asyncpg.Pool) -> None:
        super().__init__(pool)

    async def save(self, tenant: Tenant) -> None:
        params = {
            "id": str(tenant.id),
            "name": tenant.name,
            "document": tenant.document,
            "email": tenant.email,
            "addresses": [a.to_dict() for a in tenant.addresses],
            "location": tenant.location.to_dict() if tenant.location else None,
            "created_at": tenant.created_at.isoformat(),
            "updated_at": tenant.updated_at.isoformat(),
            "deleted_at": tenant.deleted_at.isoformat() if tenant.deleted_at else None,
        }
        cypher = """
        MERGE (t:Tenant {id: $id})
        SET t.name = $name,
            t.document = $document,
            t.email = $email,
            t.addresses = $addresses,
            t.location = $location,
            t.created_at = $created_at,
            t.updated_at = $updated_at,
            t.deleted_at = $deleted_at
        RETURN properties(t)
        """
        await self._cypher(cypher, params, ["props"])

    async def find_by_id(self, id: UUID) -> Optional[Tenant]:
        rows = await self._cypher(
            "MATCH (t:Tenant {id: $id}) WHERE t.deleted_at IS NULL RETURN properties(t)",
            {"id": str(id)},
            ["props"],
        )
        if not rows:
            return None
        props = self._parse_props(rows[0]["props"])
        return _tenant_from_props(props) if props else None

    async def find_all(self, skip: int = 0, limit: int = 50) -> List[Tenant]:
        rows = await self._cypher(
            "MATCH (t:Tenant) WHERE t.deleted_at IS NULL RETURN properties(t) SKIP $skip LIMIT $limit",
            {"skip": skip, "limit": limit},
            ["props"],
        )
        tenants = []
        for row in rows:
            props = self._parse_props(row["props"])
            if props:
                tenants.append(_tenant_from_props(props))
        return tenants

    async def delete(self, tenant: Tenant) -> None:
        await self._cypher(
            "MATCH (t:Tenant {id: $id}) SET t.deleted_at = $deleted_at RETURN properties(t)",
            {"id": str(tenant.id), "deleted_at": tenant.deleted_at.isoformat()},
            ["props"],
        )


class AgeAreaRepository(AgeRepository, AreaRepository):
    def __init__(self, pool: asyncpg.Pool) -> None:
        super().__init__(pool)

    async def save(self, area: Area) -> None:
        params = {
            "id": str(area.id),
            "name": area.name,
            "tenant_id": str(area.tenant_id),
            "created_at": area.created_at.isoformat(),
            "updated_at": area.updated_at.isoformat(),
            "deleted_at": area.deleted_at.isoformat() if area.deleted_at else None,
        }
        await self._cypher(
            """
            MERGE (a:Area {id: $id})
            SET a.name = $name,
                a.tenant_id = $tenant_id,
                a.created_at = $created_at,
                a.updated_at = $updated_at,
                a.deleted_at = $deleted_at
            RETURN properties(a)
            """,
            params,
            ["props"],
        )
        await self._cypher(
            """
            MATCH (t:Tenant {id: $tenant_id}), (a:Area {id: $id})
            MERGE (t)-[:HAS_AREA]->(a)
            RETURN properties(a)
            """,
            {"tenant_id": str(area.tenant_id), "id": str(area.id)},
            ["props"],
        )

    async def find_by_id(self, id: UUID) -> Optional[Area]:
        rows = await self._cypher(
            "MATCH (a:Area {id: $id}) WHERE a.deleted_at IS NULL RETURN properties(a)",
            {"id": str(id)},
            ["props"],
        )
        if not rows:
            return None
        props = self._parse_props(rows[0]["props"])
        return _area_from_props(props) if props else None

    async def find_by_tenant(
        self, tenant_id: UUID, skip: int = 0, limit: int = 50
    ) -> List[Area]:
        rows = await self._cypher(
            """
            MATCH (t:Tenant {id: $tenant_id})-[:HAS_AREA]->(a:Area)
            WHERE a.deleted_at IS NULL
            RETURN properties(a) SKIP $skip LIMIT $limit
            """,
            {"tenant_id": str(tenant_id), "skip": skip, "limit": limit},
            ["props"],
        )
        areas = []
        for row in rows:
            props = self._parse_props(row["props"])
            if props:
                areas.append(_area_from_props(props))
        return areas

    async def delete(self, area: Area) -> None:
        await self._cypher(
            "MATCH (a:Area {id: $id}) SET a.deleted_at = $deleted_at RETURN properties(a)",
            {"id": str(area.id), "deleted_at": area.deleted_at.isoformat()},
            ["props"],
        )


class AgeSubareaRepository(AgeRepository, SubareaRepository):
    def __init__(self, pool: asyncpg.Pool) -> None:
        super().__init__(pool)

    async def save(self, subarea: Subarea) -> None:
        params = {
            "id": str(subarea.id),
            "name": subarea.name,
            "area_id": str(subarea.area_id),
            "created_at": subarea.created_at.isoformat(),
            "updated_at": subarea.updated_at.isoformat(),
            "deleted_at": subarea.deleted_at.isoformat() if subarea.deleted_at else None,
        }
        await self._cypher(
            """
            MERGE (s:Subarea {id: $id})
            SET s.name = $name,
                s.area_id = $area_id,
                s.created_at = $created_at,
                s.updated_at = $updated_at,
                s.deleted_at = $deleted_at
            RETURN properties(s)
            """,
            params,
            ["props"],
        )
        await self._cypher(
            """
            MATCH (a:Area {id: $area_id}), (s:Subarea {id: $id})
            MERGE (a)-[:HAS_SUBAREA]->(s)
            RETURN properties(s)
            """,
            {"area_id": str(subarea.area_id), "id": str(subarea.id)},
            ["props"],
        )

    async def find_by_id(self, id: UUID) -> Optional[Subarea]:
        rows = await self._cypher(
            "MATCH (s:Subarea {id: $id}) WHERE s.deleted_at IS NULL RETURN properties(s)",
            {"id": str(id)},
            ["props"],
        )
        if not rows:
            return None
        props = self._parse_props(rows[0]["props"])
        return _subarea_from_props(props) if props else None

    async def find_by_area(
        self, area_id: UUID, skip: int = 0, limit: int = 50
    ) -> List[Subarea]:
        rows = await self._cypher(
            """
            MATCH (a:Area {id: $area_id})-[:HAS_SUBAREA]->(s:Subarea)
            WHERE s.deleted_at IS NULL
            RETURN properties(s) SKIP $skip LIMIT $limit
            """,
            {"area_id": str(area_id), "skip": skip, "limit": limit},
            ["props"],
        )
        subareas = []
        for row in rows:
            props = self._parse_props(row["props"])
            if props:
                subareas.append(_subarea_from_props(props))
        return subareas

    async def delete(self, subarea: Subarea) -> None:
        await self._cypher(
            "MATCH (s:Subarea {id: $id}) SET s.deleted_at = $deleted_at RETURN properties(s)",
            {"id": str(subarea.id), "deleted_at": subarea.deleted_at.isoformat()},
            ["props"],
        )
