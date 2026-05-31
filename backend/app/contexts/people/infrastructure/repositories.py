import json
from datetime import datetime
from typing import List, Optional
from uuid import UUID

import asyncpg

from app.shared.domain.value_objects import Address, Location
from app.shared.infrastructure.age_repository import AgeRepository
from ..domain.entities import Person
from ..domain.repositories import PersonRepository


def _dt(value: str | None) -> datetime | None:
    if value is None:
        return None
    return datetime.fromisoformat(value)


def _person_from_props(props: dict) -> Person:
    addresses_raw = props.get("addresses") or []
    if isinstance(addresses_raw, str):
        addresses_raw = json.loads(addresses_raw)
    addresses = [Address.from_dict(a) for a in addresses_raw]

    location_raw = props.get("location")
    if isinstance(location_raw, str):
        location_raw = json.loads(location_raw)
    location = Location.from_dict(location_raw) if location_raw else None

    return Person(
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


class AgePersonRepository(AgeRepository, PersonRepository):
    def __init__(self, pool: asyncpg.Pool) -> None:
        super().__init__(pool)

    async def save(self, person: Person) -> None:
        params = {
            "id": str(person.id),
            "name": person.name,
            "document": person.document,
            "email": person.email,
            "addresses": [a.to_dict() for a in person.addresses],
            "location": person.location.to_dict() if person.location else None,
            "created_at": person.created_at.isoformat(),
            "updated_at": person.updated_at.isoformat(),
            "deleted_at": person.deleted_at.isoformat() if person.deleted_at else None,
        }
        await self._cypher(
            """
            MERGE (p:Person {id: $id})
            SET p.name = $name,
                p.document = $document,
                p.email = $email,
                p.addresses = $addresses,
                p.location = $location,
                p.created_at = $created_at,
                p.updated_at = $updated_at,
                p.deleted_at = $deleted_at
            RETURN properties(p)
            """,
            params,
            ["props"],
        )

    async def find_by_id(self, id: UUID) -> Optional[Person]:
        rows = await self._cypher(
            "MATCH (p:Person {id: $id}) WHERE p.deleted_at IS NULL RETURN properties(p)",
            {"id": str(id)},
            ["props"],
        )
        if not rows:
            return None
        props = self._parse_props(rows[0]["props"])
        return _person_from_props(props) if props else None

    async def find_all(
        self,
        skip: int = 0,
        limit: int = 50,
        name_filter: Optional[str] = None,
    ) -> List[Person]:
        if name_filter:
            rows = await self._cypher(
                """
                MATCH (p:Person)
                WHERE p.deleted_at IS NULL AND toLower(p.name) CONTAINS toLower($name_filter)
                RETURN properties(p) SKIP $skip LIMIT $limit
                """,
                {"name_filter": name_filter, "skip": skip, "limit": limit},
                ["props"],
            )
        else:
            rows = await self._cypher(
                "MATCH (p:Person) WHERE p.deleted_at IS NULL RETURN properties(p) SKIP $skip LIMIT $limit",
                {"skip": skip, "limit": limit},
                ["props"],
            )
        people = []
        for row in rows:
            props = self._parse_props(row["props"])
            if props:
                people.append(_person_from_props(props))
        return people

    async def find_by_subarea(
        self, subarea_id: UUID, skip: int = 0, limit: int = 50
    ) -> List[Person]:
        rows = await self._cypher(
            """
            MATCH (s:Subarea {id: $subarea_id})-[:HAS_MEMBER]->(p:Person)
            WHERE p.deleted_at IS NULL
            RETURN properties(p) SKIP $skip LIMIT $limit
            """,
            {"subarea_id": str(subarea_id), "skip": skip, "limit": limit},
            ["props"],
        )
        people = []
        for row in rows:
            props = self._parse_props(row["props"])
            if props:
                people.append(_person_from_props(props))
        return people

    async def find_by_area(
        self, area_id: UUID, skip: int = 0, limit: int = 50
    ) -> List[Person]:
        rows = await self._cypher(
            """
            MATCH (a:Area {id: $area_id})-[:HAS_MEMBER]->(p:Person)
            WHERE p.deleted_at IS NULL
            RETURN properties(p) SKIP $skip LIMIT $limit
            """,
            {"area_id": str(area_id), "skip": skip, "limit": limit},
            ["props"],
        )
        people = []
        for row in rows:
            props = self._parse_props(row["props"])
            if props:
                people.append(_person_from_props(props))
        return people

    async def assign_to_subarea(self, person_id: UUID, subarea_id: UUID) -> None:
        await self._cypher(
            """
            MATCH (s:Subarea {id: $subarea_id}), (p:Person {id: $person_id})
            MERGE (s)-[:HAS_MEMBER]->(p)
            RETURN properties(p)
            """,
            {"subarea_id": str(subarea_id), "person_id": str(person_id)},
            ["props"],
        )

    async def assign_to_area(self, person_id: UUID, area_id: UUID) -> None:
        await self._cypher(
            """
            MATCH (a:Area {id: $area_id}), (p:Person {id: $person_id})
            MERGE (a)-[:HAS_MEMBER]->(p)
            RETURN properties(p)
            """,
            {"area_id": str(area_id), "person_id": str(person_id)},
            ["props"],
        )

    async def delete(self, person: Person) -> None:
        await self._cypher(
            "MATCH (p:Person {id: $id}) SET p.deleted_at = $deleted_at RETURN properties(p)",
            {"id": str(person.id), "deleted_at": person.deleted_at.isoformat()},
            ["props"],
        )

    async def get_org_path(self, person_id: UUID) -> dict:
        rows = await self._cypher(
            """
            MATCH (t:Tenant)-[:HAS_AREA]->(a:Area)-[:HAS_SUBAREA]->(s:Subarea)-[:HAS_MEMBER]->(p:Person {id: $id})
            RETURN properties(t), properties(a), properties(s), properties(p)
            """,
            {"id": str(person_id)},
            ["tenant", "area", "subarea", "person"],
        )
        if rows:
            row = rows[0]
            return {
                "tenant": self._parse_props(row["tenant"]),
                "area": self._parse_props(row["area"]),
                "subarea": self._parse_props(row["subarea"]),
                "person": self._parse_props(row["person"]),
            }

        rows = await self._cypher(
            """
            MATCH (t:Tenant)-[:HAS_AREA]->(a:Area)-[:HAS_MEMBER]->(p:Person {id: $id})
            RETURN properties(t), properties(a), properties(p)
            """,
            {"id": str(person_id)},
            ["tenant", "area", "person"],
        )
        if rows:
            row = rows[0]
            return {
                "tenant": self._parse_props(row["tenant"]),
                "area": self._parse_props(row["area"]),
                "subarea": None,
                "person": self._parse_props(row["person"]),
            }

        return {"tenant": None, "area": None, "subarea": None, "person": None}
