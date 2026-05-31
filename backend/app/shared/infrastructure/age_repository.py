import json
import asyncpg
from app.config import settings
from .database import make_age_param


class AgeRepository:
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool
        self._graph = settings.graph_name

    async def _cypher(
        self,
        cypher_query: str,
        params: dict | None = None,
        columns: list[str] | None = None,
    ) -> list[dict]:
        cols = columns or ["result"]
        col_defs = ", ".join(f"c{i} ag_catalog.agtype" for i in range(len(cols)))
        select_list = ", ".join(f"c{i}::text AS {cols[i]}" for i in range(len(cols)))

        if params:
            sql = f"""
            SELECT {select_list}
            FROM ag_catalog.cypher(
                '{self._graph}',
                $cypher${cypher_query}$cypher$,
                $1
            ) AS ({col_defs})
            """
            rows = await self._pool.fetch(sql, make_age_param(params))
        else:
            sql = f"""
            SELECT {select_list}
            FROM ag_catalog.cypher(
                '{self._graph}',
                $cypher${cypher_query}$cypher$
            ) AS ({col_defs})
            """
            rows = await self._pool.fetch(sql)

        return [dict(r) for r in rows]

    @staticmethod
    def _parse_props(text: str | None) -> dict | None:
        if not text:
            return None
        try:
            return json.loads(text)
        except (json.JSONDecodeError, TypeError):
            return None
