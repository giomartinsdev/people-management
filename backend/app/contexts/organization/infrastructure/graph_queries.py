import json
from uuid import UUID

import asyncpg

from app.config import settings
from app.shared.infrastructure.age_repository import AgeRepository
from ..interfaces.api.schemas import OrgChartNode, OrgChartResponse


class OrgChartQueryService(AgeRepository):
    """Executes the full org-chart graph traversal for a tenant."""

    def __init__(self, pool: asyncpg.Pool) -> None:
        super().__init__(pool)

    async def get_org_chart(self, tenant_id: UUID) -> OrgChartResponse:
        rows = await self._cypher(
            """
            MATCH (t:Tenant {id: $tid})
            WHERE t.deleted_at IS NULL
            OPTIONAL MATCH (t)-[:HAS_AREA]->(a:Area)
            WHERE a.deleted_at IS NULL
            OPTIONAL MATCH (a)-[:HAS_SUBAREA]->(s:Subarea)
            WHERE s.deleted_at IS NULL
            RETURN properties(t), properties(a), properties(s)
            """,
            {"tid": str(tenant_id)},
            ["tenant", "area", "subarea"],
        )

        nodes: list[OrgChartNode] = []
        seen: set[str] = set()

        for row in rows:
            tenant_props = self._parse_props(row["tenant"])
            area_props = self._parse_props(row["area"])
            subarea_props = self._parse_props(row["subarea"])

            if tenant_props and tenant_props["id"] not in seen:
                seen.add(tenant_props["id"])
                nodes.append(OrgChartNode(
                    id=UUID(tenant_props["id"]),
                    label="Tenant",
                    name=tenant_props["name"],
                ))

            if area_props and area_props["id"] not in seen:
                seen.add(area_props["id"])
                nodes.append(OrgChartNode(
                    id=UUID(area_props["id"]),
                    label="Area",
                    name=area_props["name"],
                    parent_id=UUID(area_props["tenant_id"]),
                ))

            if subarea_props and subarea_props["id"] not in seen:
                seen.add(subarea_props["id"])
                nodes.append(OrgChartNode(
                    id=UUID(subarea_props["id"]),
                    label="Subarea",
                    name=subarea_props["name"],
                    parent_id=UUID(subarea_props["area_id"]),
                ))

        return OrgChartResponse(nodes=nodes)
