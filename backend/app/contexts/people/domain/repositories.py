from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID

from .entities import Person


class PersonRepository(ABC):
    @abstractmethod
    async def save(self, person: Person) -> None: ...

    @abstractmethod
    async def find_by_id(self, id: UUID) -> Optional[Person]: ...

    @abstractmethod
    async def find_all(
        self,
        skip: int = 0,
        limit: int = 50,
        name_filter: Optional[str] = None,
    ) -> List[Person]: ...

    @abstractmethod
    async def find_by_subarea(
        self, subarea_id: UUID, skip: int = 0, limit: int = 50
    ) -> List[Person]: ...

    @abstractmethod
    async def find_by_area(
        self, area_id: UUID, skip: int = 0, limit: int = 50
    ) -> List[Person]: ...

    @abstractmethod
    async def assign_to_subarea(self, person_id: UUID, subarea_id: UUID) -> None: ...

    @abstractmethod
    async def assign_to_area(self, person_id: UUID, area_id: UUID) -> None: ...

    @abstractmethod
    async def delete(self, person: Person) -> None: ...

    @abstractmethod
    async def get_org_path(self, person_id: UUID) -> dict: ...
