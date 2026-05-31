from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID, uuid4

from app.shared.domain.entity import AggregateRoot
from app.shared.domain.value_objects import Address, Location
from .events import (
    AreaCreatedEvent,
    AreaDeletedEvent,
    AreaUpdatedEvent,
    SubareaCreatedEvent,
    SubareaDeletedEvent,
    SubareaUpdatedEvent,
    TenantCreatedEvent,
    TenantDeletedEvent,
    TenantUpdatedEvent,
)


class Tenant(AggregateRoot):
    def __init__(
        self,
        id: UUID,
        name: str,
        document: str,
        email: str,
        addresses: Optional[List[Address]] = None,
        location: Optional[Location] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        deleted_at: Optional[datetime] = None,
    ) -> None:
        super().__init__(id)
        self.name = name
        self.document = document
        self.email = email
        self.addresses: List[Address] = addresses or []
        self.location = location
        self.created_at = created_at or datetime.now(timezone.utc)
        self.updated_at = updated_at or datetime.now(timezone.utc)
        self.deleted_at = deleted_at

    @classmethod
    def create(
        cls,
        name: str,
        document: str,
        email: str,
        addresses: Optional[List[Address]] = None,
        location: Optional[Location] = None,
    ) -> "Tenant":
        tenant = cls(id=uuid4(), name=name, document=document, email=email,
                     addresses=addresses, location=location)
        tenant.add_event(TenantCreatedEvent(tenant_id=tenant.id, name=name, email=email))
        return tenant

    def update(
        self,
        name: Optional[str] = None,
        document: Optional[str] = None,
        email: Optional[str] = None,
        addresses: Optional[List[Address]] = None,
        location: Optional[Location] = None,
    ) -> None:
        if name is not None:
            self.name = name
        if document is not None:
            self.document = document
        if email is not None:
            self.email = email
        if addresses is not None:
            self.addresses = addresses
        if location is not None:
            self.location = location
        self.updated_at = datetime.now(timezone.utc)
        self.add_event(TenantUpdatedEvent(tenant_id=self.id))

    def soft_delete(self) -> None:
        self.deleted_at = datetime.now(timezone.utc)
        self.add_event(TenantDeletedEvent(tenant_id=self.id))

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None


class Area(AggregateRoot):
    def __init__(
        self,
        id: UUID,
        name: str,
        tenant_id: UUID,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        deleted_at: Optional[datetime] = None,
    ) -> None:
        super().__init__(id)
        self.name = name
        self.tenant_id = tenant_id
        self.created_at = created_at or datetime.now(timezone.utc)
        self.updated_at = updated_at or datetime.now(timezone.utc)
        self.deleted_at = deleted_at

    @classmethod
    def create(cls, name: str, tenant_id: UUID) -> "Area":
        area = cls(id=uuid4(), name=name, tenant_id=tenant_id)
        area.add_event(AreaCreatedEvent(area_id=area.id, tenant_id=tenant_id, name=name))
        return area

    def update(self, name: Optional[str] = None) -> None:
        if name is not None:
            self.name = name
        self.updated_at = datetime.now(timezone.utc)
        self.add_event(AreaUpdatedEvent(area_id=self.id))

    def soft_delete(self) -> None:
        self.deleted_at = datetime.now(timezone.utc)
        self.add_event(AreaDeletedEvent(area_id=self.id))

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None


class Subarea(AggregateRoot):
    def __init__(
        self,
        id: UUID,
        name: str,
        area_id: UUID,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        deleted_at: Optional[datetime] = None,
    ) -> None:
        super().__init__(id)
        self.name = name
        self.area_id = area_id
        self.created_at = created_at or datetime.now(timezone.utc)
        self.updated_at = updated_at or datetime.now(timezone.utc)
        self.deleted_at = deleted_at

    @classmethod
    def create(cls, name: str, area_id: UUID) -> "Subarea":
        subarea = cls(id=uuid4(), name=name, area_id=area_id)
        subarea.add_event(SubareaCreatedEvent(subarea_id=subarea.id, area_id=area_id, name=name))
        return subarea

    def update(self, name: Optional[str] = None) -> None:
        if name is not None:
            self.name = name
        self.updated_at = datetime.now(timezone.utc)
        self.add_event(SubareaUpdatedEvent(subarea_id=self.id))

    def soft_delete(self) -> None:
        self.deleted_at = datetime.now(timezone.utc)
        self.add_event(SubareaDeletedEvent(subarea_id=self.id))

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None
