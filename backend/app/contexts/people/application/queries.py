from dataclasses import dataclass
from typing import Optional
from uuid import UUID

from app.shared.application.bus import Query


@dataclass
class GetPersonQuery(Query):
    person_id: UUID


@dataclass
class ListPeopleQuery(Query):
    skip: int = 0
    limit: int = 50
    name_filter: Optional[str] = None


@dataclass
class ListPeopleBySubareaQuery(Query):
    subarea_id: UUID
    skip: int = 0
    limit: int = 50


@dataclass
class ListPeopleByAreaQuery(Query):
    area_id: UUID
    skip: int = 0
    limit: int = 50


@dataclass
class GetPersonOrgPathQuery(Query):
    person_id: UUID
