from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID

from .entities import Area, Subarea, Tenant


class TenantRepository(ABC):
    @abstractmethod
    async def save(self, tenant: Tenant) -> None: ...

    @abstractmethod
    async def find_by_id(self, id: UUID) -> Optional[Tenant]: ...

    @abstractmethod
    async def find_all(self, skip: int = 0, limit: int = 50) -> List[Tenant]: ...

    @abstractmethod
    async def delete(self, tenant: Tenant) -> None: ...


class AreaRepository(ABC):
    @abstractmethod
    async def save(self, area: Area) -> None: ...

    @abstractmethod
    async def find_by_id(self, id: UUID) -> Optional[Area]: ...

    @abstractmethod
    async def find_by_tenant(
        self, tenant_id: UUID, skip: int = 0, limit: int = 50
    ) -> List[Area]: ...

    @abstractmethod
    async def delete(self, area: Area) -> None: ...


class SubareaRepository(ABC):
    @abstractmethod
    async def save(self, subarea: Subarea) -> None: ...

    @abstractmethod
    async def find_by_id(self, id: UUID) -> Optional[Subarea]: ...

    @abstractmethod
    async def find_by_area(
        self, area_id: UUID, skip: int = 0, limit: int = 50
    ) -> List[Subarea]: ...

    @abstractmethod
    async def delete(self, subarea: Subarea) -> None: ...
