import json
import asyncpg
from app.config import settings

_pool: asyncpg.Pool | None = None


class _AgeValue:
    # Tags a JSON string so asyncpg sends it with the agtype OID rather than text.
    __slots__ = ("value",)

    def __init__(self, value: str) -> None:
        self.value = value


async def _init_connection(conn: asyncpg.Connection) -> None:
    await conn.execute("LOAD 'age'")
    await conn.set_type_codec(
        "agtype",
        schema="ag_catalog",
        encoder=lambda v: v.value,
        decoder=lambda v: v,
        format="text",
    )


async def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Database pool not initialized")
    return _pool


async def setup_database() -> None:
    global _pool
    _pool = await asyncpg.create_pool(
        dsn=settings.database_url,
        init=_init_connection,
        min_size=5,
        max_size=20,
        # server_settings persists search_path across asyncpg's per-release
        # connection resets, keeping ag_catalog visible for operator lookups.
        server_settings={"search_path": 'ag_catalog, "$user", public'},
    )


async def close_database() -> None:
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


def make_age_param(data: dict) -> _AgeValue:
    # AGE's planner errors on JSON null in the param map; absent properties
    # already return null in Cypher so stripping None is safe.
    filtered = {k: v for k, v in data.items() if v is not None}
    return _AgeValue(json.dumps(filtered))
